#!/usr/bin/env node

/**
 * Remux server — ghostty-web terminal over WebSocket.
 * Adapted from coder/ghostty-web demo (MIT).
 */

import fs from "fs";
import http from "http";
import { homedir } from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import pty from "node-pty";
import { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const PORT = process.env.PORT || 8767;

// ── Locate ghostty-web assets ──────────────────────────────────────

function findGhosttyWeb() {
  const ghosttyWebMain = require.resolve("ghostty-web");
  const ghosttyWebRoot = ghosttyWebMain.replace(/[/\\]dist[/\\].*$/, "");
  const distPath = path.join(ghosttyWebRoot, "dist");
  const wasmPath = path.join(ghosttyWebRoot, "ghostty-vt.wasm");
  if (fs.existsSync(path.join(distPath, "ghostty-web.js")) && fs.existsSync(wasmPath)) {
    return { distPath, wasmPath };
  }
  console.error("Error: ghostty-web package not found.");
  process.exit(1);
}

const { distPath, wasmPath } = findGhosttyWeb();

// ── HTML Template ──────────────────────────────────────────────────

const HTML_TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Remux</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0f172a;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .terminal-window {
        width: 100%;
        height: 100%;
        background: #1e1e1e;
        display: flex;
        flex-direction: column;
      }

      .title-bar {
        background: #2d2d2d;
        padding: 8px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid #1a1a1a;
        flex-shrink: 0;
      }

      .title {
        color: #e5e5e5;
        font-size: 13px;
        font-weight: 500;
      }

      .status {
        margin-left: auto;
        font-size: 11px;
        color: #888;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #888;
      }
      .status-dot.connected { background: #27c93f; }
      .status-dot.disconnected { background: #ff5f56; }
      .status-dot.connecting { background: #ffbd2e; animation: pulse 1s infinite; }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      #terminal {
        flex: 1;
        padding: 8px;
        background: #1e1e1e;
        overflow: hidden;
      }

      #terminal canvas { display: block; }
    </style>
  </head>
  <body>
    <div class="terminal-window">
      <div class="title-bar">
        <span class="title">Remux</span>
        <div class="status">
          <div class="status-dot connecting" id="status-dot"></div>
          <span id="status-text">Connecting...</span>
        </div>
      </div>
      <div id="terminal"></div>
    </div>

    <script type="module">
      import { init, Terminal, FitAddon } from '/dist/ghostty-web.js';

      await init();
      const term = new Terminal({
        cols: 80,
        rows: 24,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
        cursorBlink: true,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
        },
        scrollback: 10000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      const container = document.getElementById('terminal');
      term.open(container);
      fitAddon.fit();
      fitAddon.observeResize();

      window.addEventListener('resize', () => fitAddon.fit());

      // ── Status ──
      const dot = document.getElementById('status-dot');
      const text = document.getElementById('status-text');
      function setStatus(s, t) {
        dot.className = 'status-dot ' + s;
        text.textContent = t;
      }

      // ── WebSocket ──
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      let ws;

      function connect() {
        setStatus('connecting', 'Connecting...');
        ws = new WebSocket(proto + '//' + location.host + '/ws?cols=' + term.cols + '&rows=' + term.rows);

        ws.onopen = () => setStatus('connected', 'Connected');

        ws.onmessage = (e) => term.write(e.data);

        ws.onclose = () => {
          setStatus('disconnected', 'Disconnected');
          term.write('\\r\\n\\x1b[31mDisconnected. Reconnecting...\\x1b[0m\\r\\n');
          setTimeout(connect, 2000);
        };

        ws.onerror = () => setStatus('disconnected', 'Error');
      }

      connect();

      // ── Input → server ──
      term.onData((data) => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
      });

      // ── Resize → server ──
      term.onResize(({ cols, rows }) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });

      // ── Mobile keyboard ──
      if (window.visualViewport) {
        const content = document.getElementById('terminal');
        window.visualViewport.addEventListener('resize', () => {
          const kbHeight = window.innerHeight - window.visualViewport.height;
          if (kbHeight > 100) {
            content.style.height = (window.visualViewport.height - 40) + 'px';
          } else {
            content.style.height = '';
          }
          fitAddon.fit();
        });
      }
    </script>
  </body>
</html>`;

// ── MIME ────────────────────────────────────────────────────────────

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".wasm": "application/wasm",
  ".css": "text/css",
  ".json": "application/json",
};

// ── HTTP Server ────────────────────────────────────────────────────

const httpServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(HTML_TEMPLATE);
    return;
  }

  if (url.pathname.startsWith("/dist/")) {
    const filePath = path.join(distPath, url.pathname.slice(6));
    return serveFile(filePath, res);
  }

  if (url.pathname === "/ghostty-vt.wasm") {
    return serveFile(wasmPath, res);
  }

  res.writeHead(404);
  res.end("Not Found");
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not Found"); return; }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

// ── WebSocket PTY ──────────────────────────────────────────────────

const sessions = new Map();
const wss = new WebSocketServer({ noServer: true });

function getShell() {
  return process.platform === "win32"
    ? (process.env.COMSPEC || "cmd.exe")
    : (process.env.SHELL || "/bin/bash");
}

httpServer.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/ws") {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const cols = parseInt(url.searchParams.get("cols") || "80");
  const rows = parseInt(url.searchParams.get("rows") || "24");

  const ptyProcess = pty.spawn(getShell(), [], {
    name: "xterm-256color",
    cols,
    rows,
    cwd: homedir(),
    env: { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" },
  });

  sessions.set(ws, ptyProcess);

  ptyProcess.onData((data) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  });

  ptyProcess.onExit(({ exitCode }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(`\r\n\x1b[33mShell exited (code: ${exitCode})\x1b[0m\r\n`);
      ws.close();
    }
  });

  ws.on("message", (raw) => {
    const msg = raw.toString("utf8");
    if (msg.startsWith("{")) {
      try {
        const parsed = JSON.parse(msg);
        if (parsed.type === "resize") { ptyProcess.resize(parsed.cols, parsed.rows); return; }
      } catch { /* not JSON */ }
    }
    ptyProcess.write(msg);
  });

  ws.on("close", () => {
    const p = sessions.get(ws);
    if (p) { p.kill(); sessions.delete(ws); }
  });

  ws.on("error", () => {});
});

// ── Start ──────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`\n  Remux (ghostty-web) running at http://localhost:${PORT}\n`);
});

process.on("SIGINT", () => {
  for (const [ws, p] of sessions) { p.kill(); ws.close(); }
  process.exit(0);
});
