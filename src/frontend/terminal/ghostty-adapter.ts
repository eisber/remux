/**
 * ghostty-web adapter for TerminalCore.
 * Uses Ghostty's WASM-compiled VT engine for browser terminal rendering.
 */

import type { TerminalCore, TerminalOptions } from "./terminal-adapter";

export async function createGhosttyCore(
  _container: HTMLDivElement,
  _options: TerminalOptions,
): Promise<TerminalCore> {
  throw new Error("ghostty-web adapter not yet implemented");
}
