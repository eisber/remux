import { describe, expect, test } from "vitest";
import { detectAiToolContext } from "../../src/frontend/ai-tool-profile.js";
import type { PaneState } from "../../src/shared/protocol.js";

const buildPane = (overrides: Partial<PaneState> = {}): PaneState => ({
  index: 0,
  id: "pane-1",
  currentCommand: "bash",
  active: true,
  width: 120,
  height: 40,
  zoomed: false,
  currentPath: "/Users/tester/dev/remux",
  ...overrides,
});

describe("detectAiToolContext", () => {
  test("detects Codex from the active pane command", () => {
    const context = detectAiToolContext(buildPane({
      currentCommand: "/usr/local/bin/codex --approval-mode manual",
      currentPath: "/Users/tester/dev/remux",
    }));

    expect(context).not.toBeNull();
    expect(context?.profile.id).toBe("codex");
    expect(context?.projectLabel).toBe("remux");
    expect(context?.signature).toBe("codex:pane-1:/usr/local/bin/codex --approval-mode manual");
  });

  test("detects Claude Code aliases and normalizes home paths", () => {
    const context = detectAiToolContext(buildPane({
      id: "pane-9",
      currentCommand: "claude-code",
      currentPath: "/Users/tester",
    }));

    expect(context).not.toBeNull();
    expect(context?.profile.id).toBe("claude-code");
    expect(context?.pathLabel).toBe("~");
  });

  test("ignores regular shells", () => {
    expect(detectAiToolContext(buildPane({
      currentCommand: "zsh",
      currentPath: "/workspace/main",
    }))).toBeNull();
  });
});
