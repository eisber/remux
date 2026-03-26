import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const spawnMock = vi.fn();

vi.mock("node-pty", () => ({
  spawn: spawnMock
}));

describe("ZellijCliExecutor", () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    vi.resetModules();
    spawnMock.mockReset();
  });

  const makeSocketDir = (): string => {
    const socketDir = fs.mkdtempSync(path.join(os.tmpdir(), "remux-zellij-test-"));
    tempDirs.push(socketDir);
    return socketDir;
  };

  test("filters session list to sockets that exist in the isolated socket dir", async () => {
    const socketDir = makeSocketDir();
    fs.mkdirSync(path.join(socketDir, "contract_version_1"), { recursive: true });
    fs.writeFileSync(path.join(socketDir, "contract_version_1", "isolated"), "");

    const { ZellijCliExecutor } = await import("../../src/backend/zellij/cli-executor.js");
    const executor = new ZellijCliExecutor({
      socketDir,
      logger: { log: vi.fn(), error: vi.fn() }
    });

    const executorWithInternals = executor as unknown as {
      listSessionSummaries: () => Promise<Array<{ name: string; attached: boolean }>>;
      listTabs: (name: string) => Promise<Array<{ index: number }>>;
    };
    executorWithInternals.listSessionSummaries = vi.fn().mockResolvedValue([
      { name: "global-only", attached: false },
      { name: "isolated", attached: false }
    ]);
    executorWithInternals.listTabs = vi.fn().mockResolvedValue([{ index: 0 }]);

    await expect(executor.listSessions()).resolves.toEqual([
      { name: "isolated", attached: false, tabCount: 0 }
    ]);
  });

  test("does not treat same-named global metadata as an existing isolated session", async () => {
    const socketDir = makeSocketDir();

    const { ZellijCliExecutor } = await import("../../src/backend/zellij/cli-executor.js");
    const executor = new ZellijCliExecutor({
      socketDir,
      logger: { log: vi.fn(), error: vi.fn() }
    });

    const executorWithInternals = executor as unknown as {
      listSessionSummaries: () => Promise<Array<{ name: string }>>;
      spawnSessionBootstrap: (name: string) => Promise<void>;
    };
    executorWithInternals.listSessionSummaries = vi.fn().mockResolvedValue([{ name: "shared-name" }]);
    executorWithInternals.spawnSessionBootstrap = vi.fn().mockResolvedValue(undefined);

    await expect(executor.createSession("shared-name")).resolves.toBeUndefined();

    expect(executorWithInternals.spawnSessionBootstrap).toHaveBeenCalledWith("shared-name");
  });

  test("falls back to PTY bootstrap when attach -b fails", async () => {
    const kill = vi.fn();
    const onExit = vi.fn();
    spawnMock.mockReturnValue({ kill, onExit });

    const { ZellijCliExecutor } = await import("../../src/backend/zellij/cli-executor.js");
    const executor = new ZellijCliExecutor({
      timeoutMs: 500,
      logger: { log: vi.fn(), error: vi.fn() }
    });

    const executorWithInternals = executor as unknown as {
      tryCreateSessionInBackground: (name: string) => Promise<boolean>;
      listSessionSummaries: () => Promise<Array<{ name: string }>>;
      listSessionSummariesImmediate: () => Promise<Array<{ name: string }>>;
    };

    executorWithInternals.tryCreateSessionInBackground = vi.fn().mockRejectedValue(
      new Error("attach -b failed")
    );
    const listSessionsMock = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ name: "fallback-session" }]);
    executorWithInternals.listSessionSummaries = listSessionsMock;
    executorWithInternals.listSessionSummariesImmediate = listSessionsMock;
    const shellCommand = await (executor as unknown as {
      getRemuxShellCommand: () => Promise<string[]>;
    }).getRemuxShellCommand();

    await expect(executor.createSession("fallback-session")).resolves.toBeUndefined();

    expect(executorWithInternals.tryCreateSessionInBackground).toHaveBeenCalledWith("fallback-session");
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0]?.[1]?.[1]).toContain("'attach' '-c' 'fallback-session' 'options' '--default-shell'");
    expect(spawnMock.mock.calls[0]?.[2]?.env).toEqual(expect.objectContaining({
      SHELL: shellCommand[0],
      REMUX_ORIGINAL_SHELL: process.env.SHELL?.trim() || "/bin/sh",
      REMUX: "1"
    }));
    expect(kill).toHaveBeenCalledTimes(1);
  });

  test("uses the remux shell wrapper for new tabs and panes", async () => {
    const socketDir = makeSocketDir();
    const { ZellijCliExecutor } = await import("../../src/backend/zellij/cli-executor.js");
    const executor = new ZellijCliExecutor({
      socketDir,
      logger: { log: vi.fn(), error: vi.fn() }
    });

    const executorWithInternals = executor as unknown as {
      paneSessionMap: Map<string, string>;
      runZellij: (args: string[], session?: string) => Promise<string>;
      getRemuxShellCommand: () => Promise<string[]>;
    };
    const runZellij = vi.fn().mockResolvedValue("");
    executorWithInternals.runZellij = runZellij;
    executorWithInternals.paneSessionMap.set("terminal_1", "main");

    const shellCommand = await executorWithInternals.getRemuxShellCommand();

    await executor.newTab("main");
    await executor.splitPane("terminal_1", "right");

    expect(shellCommand).toHaveLength(1);
    expect(fs.readFileSync(shellCommand[0], "utf8")).toContain("export REMUX=1");
    expect(runZellij).toHaveBeenNthCalledWith(
      1,
      ["action", "new-tab", "--", ...shellCommand],
      "main"
    );
    expect(runZellij).toHaveBeenNthCalledWith(
      2,
      ["action", "hide-floating-panes"],
      "main"
    );
    expect(runZellij).toHaveBeenNthCalledWith(
      3,
      ["action", "list-panes", "--json", "--all"],
      "main"
    );
    expect(runZellij).toHaveBeenNthCalledWith(
      4,
      ["action", "new-pane", "-d", "right", "--", ...shellCommand],
      "main"
    );
  });

  test("builds a snapshot with one tabs call and one panes call per live session", async () => {
    const { ZellijCliExecutor } = await import("../../src/backend/zellij/cli-executor.js");
    const executor = new ZellijCliExecutor({
      logger: { log: vi.fn(), error: vi.fn() }
    });

    const executorWithInternals = executor as unknown as {
      buildSnapshot: () => Promise<{
        sessions: Array<{ name: string; lifecycle?: string; tabCount: number; tabs: Array<{ paneCount: number }> }>;
      }>;
      listSessionSummaries: () => Promise<Array<{ name: string; attached: boolean; tabCount: number; lifecycle?: string }>>;
      sessionExistsInSocketDir: (name: string) => Promise<boolean>;
      runZellij: (args: string[], session?: string) => Promise<string>;
    };

    executorWithInternals.listSessionSummaries = vi.fn().mockResolvedValue([
      { name: "live", attached: true, tabCount: 0, lifecycle: "live" },
      { name: "saved", attached: false, tabCount: 0, lifecycle: "exited" }
    ]);
    executorWithInternals.sessionExistsInSocketDir = vi.fn().mockResolvedValue(true);
    executorWithInternals.runZellij = vi.fn()
      .mockResolvedValueOnce(JSON.stringify([
        {
          position: 0,
          name: "shell",
          active: true,
          is_fullscreen_active: false,
          is_sync_panes_active: false,
          are_floating_panes_visible: false,
          viewport_rows: 24,
          viewport_columns: 120,
          display_area_rows: 24,
          display_area_columns: 120,
          selectable_tiled_panes_count: 1,
          selectable_floating_panes_count: 0,
          tab_id: 7
        }
      ]))
      .mockResolvedValueOnce(JSON.stringify([
        {
          id: 3,
          is_plugin: false,
          is_focused: true,
          is_fullscreen: false,
          is_floating: false,
          is_suppressed: false,
          title: "shell",
          exited: false,
          exit_status: null,
          is_held: false,
          pane_x: 0,
          pane_y: 0,
          pane_rows: 24,
          pane_columns: 120,
          pane_content_rows: 22,
          pane_content_columns: 118,
          cursor_coordinates_in_pane: [0, 0],
          terminal_command: "/bin/zsh",
          plugin_url: null,
          is_selectable: true,
          tab_id: 7,
          tab_position: 0,
          tab_name: "shell",
          pane_cwd: "/tmp"
        }
      ]));

    const snapshot = await executorWithInternals.buildSnapshot();

    expect(executorWithInternals.runZellij).toHaveBeenCalledTimes(2);
    expect(snapshot.sessions).toHaveLength(2);
    expect(snapshot.sessions[0]).toMatchObject({
      name: "live",
      tabCount: 1,
      tabs: [{ paneCount: 1 }]
    });
    expect(snapshot.sessions[1]).toMatchObject({
      name: "saved",
      lifecycle: "exited",
      tabCount: 0,
      tabs: []
    });
  });

  test("reports zellij scrollback as approximate", async () => {
    const { ZellijCliExecutor } = await import("../../src/backend/zellij/cli-executor.js");
    const executor = new ZellijCliExecutor({
      logger: { log: vi.fn(), error: vi.fn() }
    });

    expect(executor.capabilities.supportsPreciseScrollback).toBe(false);

    const executorWithInternals = executor as unknown as {
      paneSessionMap: Map<string, string>;
      runZellij: (args: string[], session?: string, options?: { raw?: boolean }) => Promise<string>;
    };
    executorWithInternals.paneSessionMap.set("terminal_3", "main");
    executorWithInternals.runZellij = vi.fn()
      .mockResolvedValueOnce("line 1\nline 2\n")
      .mockResolvedValueOnce(JSON.stringify([
        { id: 3, is_plugin: false, pane_content_columns: 118 }
      ]));

    await expect(executor.capturePane("terminal_3", { lines: 10 })).resolves.toEqual({
      text: "line 1\nline 2\n",
      paneWidth: 118,
      isApproximate: true
    });
  });

  test("passes the remux shell wrapper to background session creation", async () => {
    const socketDir = makeSocketDir();
    const { ZellijCliExecutor } = await import("../../src/backend/zellij/cli-executor.js");
    const executor = new ZellijCliExecutor({
      socketDir,
      logger: { log: vi.fn(), error: vi.fn() }
    });

    const executorWithInternals = executor as unknown as {
      runZellij: (args: string[], session?: string) => Promise<string>;
      listSessionSummariesImmediate: () => Promise<Array<{ name: string }>>;
      getRemuxShellCommand: () => Promise<string[]>;
      tryCreateSessionInBackground: (name: string) => Promise<boolean>;
    };
    const runZellij = vi.fn().mockResolvedValue("");
    executorWithInternals.runZellij = runZellij;
    executorWithInternals.listSessionSummariesImmediate = vi.fn().mockResolvedValue([
      { name: "background-session" }
    ]);

    const shellCommand = await executorWithInternals.getRemuxShellCommand();
    await expect(
      executorWithInternals.tryCreateSessionInBackground("background-session")
    ).resolves.toBe(true);

    expect(runZellij).toHaveBeenCalledWith(
      ["attach", "-b", "background-session", "options", "--default-shell", shellCommand[0]],
      undefined,
      {
        env: expect.objectContaining({
          SHELL: shellCommand[0],
          REMUX_ORIGINAL_SHELL: process.env.SHELL?.trim() || "/bin/sh"
        })
      }
    );
  });

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
