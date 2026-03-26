import { describe, expect, test, vi } from "vitest";
import {
  buildLaunchUrl,
  detectTmuxLaunchContext,
  parseTmuxLaunchContext
} from "../../src/backend/launch-context.js";

describe("backend launch context", () => {
  test("parses tmux display output into launch context", () => {
    expect(parseTmuxLaunchContext("work\t3\t%17\n")).toEqual({
      session: "work",
      tabIndex: 3,
      paneId: "%17"
    });
  });

  test("returns null for invalid tmux display output", () => {
    expect(parseTmuxLaunchContext("\n")).toBeNull();
  });

  test("only detects tmux launch context when running inside tmux on tmux backend", () => {
    const execFile = vi.fn(() => "dev\t1\t%3\n");

    expect(detectTmuxLaunchContext({
      backendKind: "zellij",
      env: { TMUX: "/tmp/tmux-1000/default,123,0" },
      execFile
    })).toBeNull();
    expect(execFile).not.toHaveBeenCalled();

    expect(detectTmuxLaunchContext({
      backendKind: "tmux",
      env: {},
      execFile
    })).toBeNull();
    expect(execFile).not.toHaveBeenCalled();
  });

  test("detects tmux launch context from display-message output", () => {
    const execFile = vi.fn(() => "dev\t1\t%3\n");

    expect(detectTmuxLaunchContext({
      backendKind: "tmux",
      env: { TMUX: "/tmp/tmux-1000/default,123,0" },
      execFile
    })).toEqual({
      session: "dev",
      tabIndex: 1,
      paneId: "%3"
    });
    expect(execFile).toHaveBeenCalledWith(
      "tmux",
      ["display-message", "-p", "#S\t#I\t#D"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
  });

  test("builds launch URL with token and launch hint", () => {
    expect(buildLaunchUrl("https://example.com", "tok", {
      session: "work",
      tabIndex: 2,
      paneId: "%9"
    })).toBe("https://example.com/?token=tok&session=work&tab=2&pane=%259");
  });
});
