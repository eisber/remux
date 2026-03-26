import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const nodePtySpawnMock = vi.fn();
const childSpawnMock = vi.fn();
const execFileMock = vi.fn();

vi.mock("node-pty", () => ({
  spawn: nodePtySpawnMock
}));

vi.mock("node:child_process", () => ({
  spawn: childSpawnMock,
  execFile: execFileMock
}));

class FakeSubscribeProcess extends EventEmitter {
  public readonly stdout = new EventEmitter();
  public readonly stderr = new EventEmitter();
  public readonly kill = vi.fn();
}

describe("ZellijPaneIO", () => {
  beforeEach(() => {
    vi.resetModules();
    nodePtySpawnMock.mockReset();
    childSpawnMock.mockReset();
    execFileMock.mockReset();
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      callback?.(null, { stdout: "", stderr: "" });
    });
    childSpawnMock.mockImplementation(() => new FakeSubscribeProcess());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("uses a dedicated hidden client per runtime and forwards resize to it", async () => {
    const firstClient = {
      resize: vi.fn(),
      write: vi.fn(),
      kill: vi.fn(),
      onExit: vi.fn()
    };
    const secondClient = {
      resize: vi.fn(),
      write: vi.fn(),
      kill: vi.fn(),
      onExit: vi.fn()
    };
    nodePtySpawnMock
      .mockReturnValueOnce(firstClient)
      .mockReturnValueOnce(secondClient);

    const { ZellijPaneIO } = await import("../../src/backend/zellij/pane-io.js");

    const first = new ZellijPaneIO({ session: "main", paneId: "terminal_1" });
    const second = new ZellijPaneIO({ session: "main", paneId: "terminal_2" });

    expect(nodePtySpawnMock).toHaveBeenCalledTimes(2);

    first.resize(120, 40);
    second.resize(90, 30);

    expect(firstClient.resize).toHaveBeenCalledWith(120, 40);
    expect(secondClient.resize).toHaveBeenCalledWith(90, 30);

    first.kill();
    second.kill();

    expect(firstClient.kill).toHaveBeenCalledTimes(1);
    expect(secondClient.kill).toHaveBeenCalledTimes(1);
  });
});
