// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

/**
 * Test the ghostty adapter's serialize and lineToString logic.
 * We cannot load real ghostty-web WASM in unit tests, so we mock
 * the module and test the buffer-walking logic via the adapter interface.
 */

// Mock ghostty-web module — must use class/function for `new` to work
vi.mock("ghostty-web", () => {
  class MockFitAddon {
    activate() {}
    dispose() {}
    fit() {}
    proposeDimensions() { return { cols: 80, rows: 24 }; }
  }
  return {
    init: vi.fn().mockResolvedValue(undefined),
    Terminal: function MockTerminal(opts: any) { return createMockTerminal(opts); },
    FitAddon: MockFitAddon,
  };
});

function createMockTerminal(_opts: any) {
  const lines: string[] = [];
  return {
    cols: 80,
    rows: 24,
    loadAddon: vi.fn(),
    open: vi.fn(),
    write: vi.fn(),
    dispose: vi.fn(),
    focus: vi.fn(),
    buffer: {
      active: {
        get length() {
          return lines.length;
        },
        getLine: (i: number) =>
          i < lines.length
            ? { translateToString: (trim?: boolean) => (trim ? lines[i].trimEnd() : lines[i]) }
            : null,
      },
    },
    _setLines: (newLines: string[]) => {
      lines.length = 0;
      lines.push(...newLines);
    },
  };
}

describe("ghostty-adapter", () => {
  it("creates a TerminalCore with ghostty backend", async () => {
    const { createGhosttyCore } = await import("../../src/frontend/terminal/ghostty-adapter");
    const container = document.createElement("div");
    const core = await createGhosttyCore(container, {
      cursorBlink: true,
      scrollback: 10000,
      fontFamily: "monospace",
      fontSize: 14,
      theme: { background: "#000", foreground: "#fff", cursor: "#0f0" },
    });

    expect(core.backend).toBe("ghostty");
    expect(core.terminal).toBeDefined();
    expect(core.fitAddon).toBeDefined();
    expect(typeof core.serialize).toBe("function");
    expect(typeof core.lineToString).toBe("function");
    expect(typeof core.dispose).toBe("function");

    core.dispose();
  });

  it("serialize returns joined buffer lines trimmed", async () => {
    const { createGhosttyCore } = await import("../../src/frontend/terminal/ghostty-adapter");
    const container = document.createElement("div");
    const core = await createGhosttyCore(container, {
      cursorBlink: true,
      scrollback: 10000,
      fontFamily: "monospace",
      fontSize: 14,
      theme: { background: "#000", foreground: "#fff", cursor: "#0f0" },
    });

    // Set mock buffer lines
    (core.terminal as any)._setLines(["hello world  ", "second line", "", ""]);

    const result = core.serialize({ scrollback: 10000 });
    // Trailing empty lines should be trimmed
    expect(result).toBe("hello world\nsecond line");

    core.dispose();
  });

  it("serialize respects scrollback limit", async () => {
    const { createGhosttyCore } = await import("../../src/frontend/terminal/ghostty-adapter");
    const container = document.createElement("div");
    const core = await createGhosttyCore(container, {
      cursorBlink: true,
      scrollback: 10000,
      fontFamily: "monospace",
      fontSize: 14,
      theme: { background: "#000", foreground: "#fff", cursor: "#0f0" },
    });

    (core.terminal as any)._setLines(["line1", "line2", "line3", "line4", "line5"]);

    // Only last 2 lines
    const result = core.serialize({ scrollback: 2 });
    expect(result).toBe("line4\nline5");

    core.dispose();
  });

  it("lineToString returns empty string for invalid index", async () => {
    const { createGhosttyCore } = await import("../../src/frontend/terminal/ghostty-adapter");
    const container = document.createElement("div");
    const core = await createGhosttyCore(container, {
      cursorBlink: true,
      scrollback: 10000,
      fontFamily: "monospace",
      fontSize: 14,
      theme: { background: "#000", foreground: "#fff", cursor: "#0f0" },
    });

    (core.terminal as any)._setLines(["hello"]);
    expect(core.lineToString(0)).toBe("hello");
    expect(core.lineToString(99)).toBe("");

    core.dispose();
  });

  it("serialize handles empty buffer", async () => {
    const { createGhosttyCore } = await import("../../src/frontend/terminal/ghostty-adapter");
    const container = document.createElement("div");
    const core = await createGhosttyCore(container, {
      cursorBlink: true,
      scrollback: 10000,
      fontFamily: "monospace",
      fontSize: 14,
      theme: { background: "#000", foreground: "#fff", cursor: "#0f0" },
    });

    (core.terminal as any)._setLines([]);
    expect(core.serialize({ scrollback: 10000 })).toBe("");

    core.dispose();
  });
});
