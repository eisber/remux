/**
 * ghostty-web adapter for TerminalCore.
 * Uses Ghostty's WASM-compiled VT engine for browser terminal rendering.
 */

import type { TerminalCore, TerminalOptions } from "./terminal-adapter";

export async function createGhosttyCore(
  _container: HTMLDivElement,
  options: TerminalOptions,
): Promise<TerminalCore> {
  const ghostty = await import("ghostty-web");
  await ghostty.init();

  const terminal = new ghostty.Terminal({
    cursorBlink: options.cursorBlink,
    scrollback: options.scrollback,
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    theme: options.theme,
  });

  const fitAddon = new ghostty.FitAddon();
  terminal.loadAddon(fitAddon);

  return {
    terminal,
    fitAddon,
    backend: "ghostty",
    serialize: (opts) => serializeBuffer(terminal, opts.scrollback),
    lineToString: (lineIndex) => {
      return terminal.buffer.active.getLine(lineIndex)?.translateToString(true) ?? "";
    },
    dispose: () => {
      fitAddon.dispose();
      terminal.dispose();
    },
  };
}

/**
 * Serialize terminal buffer by walking lines.
 * ghostty-web has translateToString() on buffer lines but no SerializeAddon,
 * so we walk the buffer manually. Output is plain text (no ANSI escapes),
 * which matches how the consumer uses it (ANSI is stripped anyway).
 */
function serializeBuffer(terminal: any, scrollback: number): string {
  const buffer = terminal.buffer.active;
  const totalLines = buffer.length;
  const startLine = Math.max(0, totalLines - scrollback);
  const lines: string[] = [];

  for (let i = startLine; i < totalLines; i++) {
    const line = buffer.getLine(i);
    lines.push(line?.translateToString(true) ?? "");
  }

  // Trim trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}
