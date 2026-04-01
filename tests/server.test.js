/**
 * Integration tests for Remux server.
 * Tests: startup, HTTP auth, WebSocket session/tab management, VT snapshot, persistence.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "child_process";
import http from "http";
import WebSocket from "ws";
import fs from "fs";
import path from "path";
import { homedir } from "os";

const PORT = 19876; // test-only port
const TOKEN = "test-token-" + Date.now();
const PERSIST_FILE = path.join(homedir(), ".remux", `sessions-port-${PORT}.json`);
let serverProc;

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${urlPath}`, (res) => {
      let body = "";
      res.on("data", (d) => (body += d));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });
}

function connectWs() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

function sendAndCollect(ws, msg, { timeout = 3000, filter } = {}) {
  return new Promise((resolve) => {
    const messages = [];
    const handler = (raw) => {
      const s = raw.toString();
      try {
        const parsed = JSON.parse(s);
        if (!filter || filter(parsed)) messages.push(parsed);
      } catch {
        messages.push({ _raw: s });
      }
    };
    ws.on("message", handler);
    if (msg) ws.send(JSON.stringify(msg));
    setTimeout(() => {
      ws.removeListener("message", handler);
      resolve(messages);
    }, timeout);
  });
}

function waitForMsg(ws, type, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeout);
    const handler = (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === type) {
          clearTimeout(timer);
          ws.removeListener("message", handler);
          resolve(msg);
        }
      } catch {}
    };
    ws.on("message", handler);
  });
}

beforeAll(async () => {
  // Clean persistence file to ensure clean state
  try { fs.unlinkSync(PERSIST_FILE); } catch {}

  serverProc = spawn("node", ["server.js"], {
    env: { ...process.env, PORT: String(PORT), REMUX_TOKEN: TOKEN },
    stdio: "pipe",
  });

  // Wait for server to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("server start timeout")), 10000);
    serverProc.stdout.on("data", (d) => {
      if (d.toString().includes("Remux running")) {
        clearTimeout(timeout);
        // Extra delay for WASM init
        setTimeout(resolve, 2000);
      }
    });
    serverProc.on("error", reject);
  });
}, 15000);

afterAll(() => {
  if (serverProc) {
    serverProc.kill("SIGTERM");
  }
});

describe("HTTP", () => {
  it("rejects requests without token", async () => {
    const res = await httpGet("/");
    expect(res.status).toBe(403);
  });

  it("serves page with correct token", async () => {
    const res = await httpGet(`/?token=${TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body).toContain("ghostty-web");
    expect(res.body).toContain("<title>Remux</title>");
  });

  it("serves ghostty-web JS", async () => {
    const res = await httpGet("/dist/ghostty-web.js");
    expect(res.status).toBe(200);
  });

  it("serves WASM file", async () => {
    const res = await httpGet("/ghostty-vt.wasm");
    expect(res.status).toBe(200);
  });
});

describe("WebSocket auth", () => {
  it("rejects connection without auth", async () => {
    const ws = await connectWs();
    ws.send(JSON.stringify({ type: "attach_first", session: "main" }));
    const msg = await waitForMsg(ws, "auth_error");
    expect(msg.reason).toBe("invalid token");
    ws.close();
  });

  it("accepts connection with valid token", async () => {
    const ws = await connectWs();
    ws.send(JSON.stringify({ type: "auth", token: TOKEN }));
    const msg = await waitForMsg(ws, "auth_ok");
    expect(msg.type).toBe("auth_ok");
    ws.close();
  });
});

describe("session and tab management", () => {
  let ws;
  let initialState;

  beforeAll(async () => {
    ws = await connectWs();
    // Register both handlers before sending auth to avoid losing the state
    // message that the server sends immediately after auth_ok
    const authP = waitForMsg(ws, "auth_ok");
    const stateP = waitForMsg(ws, "state");
    ws.send(JSON.stringify({ type: "auth", token: TOKEN }));
    await authP;
    initialState = await stateP;
  });

  afterAll(() => ws?.close());

  it("receives state with default session on connect", async () => {
    expect(initialState.sessions.length).toBeGreaterThanOrEqual(1);
    const main = initialState.sessions.find((s) => s.name === "main");
    expect(main).toBeDefined();
    expect(main.tabs.length).toBeGreaterThanOrEqual(1);
  });

  it("attaches to first tab and receives terminal data", async () => {
    const msgs = await sendAndCollect(
      ws,
      { type: "attach_first", session: "main", cols: 80, rows: 24 },
      { timeout: 3000 },
    );
    // Should get state + attached + terminal output
    const attached = msgs.find((m) => m.type === "attached");
    expect(attached).toBeDefined();
    expect(attached.session).toBe("main");
    expect(typeof attached.tabId).toBe("number");

    // Should receive some terminal data (VT snapshot or shell output)
    const hasTermData = msgs.some((m) => m._raw);
    expect(hasTermData).toBe(true);
  });

  it("creates new tab in current session", async () => {
    const msgs = await sendAndCollect(
      ws,
      { type: "new_tab", session: "main", cols: 80, rows: 24 },
      { timeout: 3000 },
    );
    const attached = msgs.find((m) => m.type === "attached");
    expect(attached).toBeDefined();
    expect(attached.session).toBe("main");

    // State should show 2+ tabs
    const state = msgs.filter((m) => m.type === "state").pop();
    if (state) {
      const main = state.sessions.find((s) => s.name === "main");
      expect(main.tabs.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("creates new session with tab", async () => {
    const msgs = await sendAndCollect(
      ws,
      { type: "new_session", name: "test-session", cols: 80, rows: 24 },
      { timeout: 3000 },
    );
    const attached = msgs.find((m) => m.type === "attached");
    expect(attached).toBeDefined();
    expect(attached.session).toBe("test-session");

    const state = msgs.filter((m) => m.type === "state").pop();
    if (state) {
      expect(state.sessions.some((s) => s.name === "test-session")).toBe(true);
    }
  });

  it("deletes session", async () => {
    // Switch back to main first
    await sendAndCollect(ws, { type: "attach_first", session: "main", cols: 80, rows: 24 }, { timeout: 1000 });

    const msgs = await sendAndCollect(
      ws,
      { type: "delete_session", name: "test-session" },
      { timeout: 2000 },
    );
    const state = msgs.filter((m) => m.type === "state").pop();
    if (state) {
      expect(state.sessions.some((s) => s.name === "test-session")).toBe(false);
    }
  });

  it("handles resize", async () => {
    // Should not throw
    ws.send(JSON.stringify({ type: "resize", cols: 120, rows: 40 }));
    await new Promise((r) => setTimeout(r, 200));
  });
});

describe("VT snapshot", () => {
  it("sends VT snapshot with truecolor on attach", async () => {
    const ws = await connectWs();
    ws.send(JSON.stringify({ type: "auth", token: TOKEN }));
    await waitForMsg(ws, "auth_ok");

    let termData = "";
    ws.on("message", (raw) => {
      const s = raw.toString();
      if (!s.startsWith("{")) termData += s;
    });

    ws.send(JSON.stringify({ type: "attach_first", session: "main", cols: 80, rows: 24 }));
    await new Promise((r) => setTimeout(r, 3000));

    // Snapshot should contain VT escape sequences
    expect(termData.length).toBeGreaterThan(0);
    // Should have cursor positioning
    expect(termData).toContain("\x1b[");

    ws.close();
  }, 10000);
});

describe("persistence", () => {
  it("saves sessions to disk within 10 seconds", async () => {
    // Wait for persistence timer
    await new Promise((r) => setTimeout(r, 10000));

    expect(fs.existsSync(PERSIST_FILE)).toBe(true);
    const data = JSON.parse(fs.readFileSync(PERSIST_FILE, "utf8"));
    expect(data.version).toBe(1);
    expect(data.sessions.length).toBeGreaterThanOrEqual(1);
    expect(data.sessions[0].name).toBe("main");
    expect(data.sessions[0].tabs.length).toBeGreaterThanOrEqual(1);
  }, 15000);
});
