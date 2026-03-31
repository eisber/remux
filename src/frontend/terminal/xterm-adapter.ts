/**
 * xterm.js compatibility adapter for TerminalCore.
 * Wraps the existing xterm.js initialization as a compat fallback.
 */

import type { TerminalCore, TerminalOptions } from "./terminal-adapter";

export function createXtermCore(
  _container: HTMLDivElement,
  _options: TerminalOptions,
): TerminalCore {
  throw new Error("xterm adapter not yet implemented");
}
