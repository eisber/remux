import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

import { ZellijController } from "../../src/backend/zellij-controller.js";

describe("ZellijController session helpers", () => {
  const originalReaddirSync = fs.readdirSync;
  const originalLstatSync = fs.lstatSync;
  let tempRoot = "";

  beforeEach(() => {
    execFileMock.mockReset();
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "remux-zellij-controller-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("parses structured session info from zellij list-sessions", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      callback(null, {
        stdout: [
          "remux-dev [Created 14h 17m 18s ago]",
          "old-project [Created 4days ago] (EXITED - attach to resurrect)",
        ].join("\n"),
      });
    });

    const controller = new ZellijController({ session: "remux-dev", zellijBin: "zellij" });
    await expect(controller.listSessionsStructured()).resolves.toEqual([
      {
        name: "remux-dev",
        createdAgo: "14h 17m 18s",
        isActive: true,
      },
      {
        name: "old-project",
        createdAgo: "4days",
        isActive: false,
      },
    ]);
  });

  it("uses global zellij commands for kill and force delete session", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      callback(null, { stdout: "" });
    });

    const controller = new ZellijController({ session: "ignored", zellijBin: "zellij" });
    await controller.killSession("alpha");
    await controller.deleteSession("alpha");

    expect(execFileMock).toHaveBeenNthCalledWith(
      1,
      "zellij",
      ["kill-session", "alpha"],
      { timeout: 5000 },
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      2,
      "zellij",
      ["delete-session", "--force", "alpha"],
      { timeout: 5000 },
      expect.any(Function),
    );
  });

  it("falls back to zellij session sockets when list-sessions hangs", async () => {
    const contractDir = path.join(tempRoot, "zellij-501", "contract_version_1");
    fs.mkdirSync(contractDir, { recursive: true });
    const socketName = "remux-dev";
    vi.spyOn(os, "tmpdir").mockReturnValue(tempRoot);
    vi.spyOn(process, "getuid").mockReturnValue(501);
    vi.spyOn(fs, "readdirSync").mockImplementation(((targetPath: fs.PathLike, options?: unknown) => {
      if (String(targetPath) === path.join(tempRoot, "zellij-501")) {
        return [
          {
            name: "contract_version_1",
            isDirectory: () => true,
            isFile: () => false,
            isSocket: () => false,
            isSymbolicLink: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isFIFO: () => false,
          },
        ] as unknown as ReturnType<typeof fs.readdirSync>;
      }
      if (String(targetPath) === contractDir) {
        return [
          {
            name: socketName,
            isDirectory: () => false,
            isFile: () => false,
            isSocket: () => true,
            isSymbolicLink: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isFIFO: () => false,
          },
          {
            name: "web_server_bus",
            isDirectory: () => false,
            isFile: () => false,
            isSocket: () => false,
            isSymbolicLink: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isFIFO: () => false,
          },
        ] as unknown as ReturnType<typeof fs.readdirSync>;
      }
      return originalReaddirSync(targetPath, options as never);
    }) as typeof fs.readdirSync);
    vi.spyOn(fs, "lstatSync").mockImplementation(((targetPath: fs.PathLike) => {
      if (String(targetPath) === path.join(contractDir, socketName)) {
        return {
          isDirectory: () => false,
          isFile: () => false,
          isSocket: () => true,
          isSymbolicLink: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isFIFO: () => false,
          mtimeMs: Date.now() - 65_000,
        } as fs.Stats;
      }
      return originalLstatSync(targetPath);
    }) as typeof fs.lstatSync);
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      callback(new Error("timed out"));
    });

    const controller = new ZellijController({ session: "ignored", zellijBin: "zellij" });
    await expect(controller.listSessionsStructured()).resolves.toEqual([
      {
        name: "remux-dev",
        createdAgo: "1m 5s",
        isActive: true,
      },
    ]);
  });

  it("falls back to killing socket owners when force delete fails", async () => {
    const contractDir = path.join(tempRoot, "zellij-501", "contract_version_1");
    const socketPath = path.join(contractDir, "alpha");
    fs.mkdirSync(contractDir, { recursive: true });
    fs.writeFileSync(socketPath, "");
    vi.spyOn(os, "tmpdir").mockReturnValue(tempRoot);
    vi.spyOn(process, "getuid").mockReturnValue(501);
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
    const lstatSpy = vi.spyOn(fs, "lstatSync").mockImplementation(((targetPath: fs.PathLike) => {
      if (String(targetPath) === socketPath) {
        return {
          isDirectory: () => false,
          isFile: () => false,
          isSocket: () => true,
          isSymbolicLink: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isFIFO: () => false,
          mtimeMs: Date.now(),
        } as fs.Stats;
      }
      return originalLstatSync(targetPath);
    }) as typeof fs.lstatSync);
    const readdirSpy = vi.spyOn(fs, "readdirSync").mockImplementation(((targetPath: fs.PathLike, options?: unknown) => {
      if (String(targetPath) === path.join(tempRoot, "zellij-501")) {
        return [
          {
            name: "contract_version_1",
            isDirectory: () => true,
            isFile: () => false,
            isSocket: () => false,
            isSymbolicLink: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isFIFO: () => false,
          },
        ] as unknown as ReturnType<typeof fs.readdirSync>;
      }
      if (String(targetPath) === contractDir) {
        return [
          {
            name: "alpha",
            isDirectory: () => false,
            isFile: () => false,
            isSocket: () => true,
            isSymbolicLink: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isFIFO: () => false,
          },
        ] as unknown as ReturnType<typeof fs.readdirSync>;
      }
      return originalReaddirSync(targetPath, options as never);
    }) as typeof fs.readdirSync);
    let lsofCall = 0;
    execFileMock.mockImplementation((_file, args, _options, callback) => {
      if (args[0] === "delete-session") {
        callback(new Error("failed"));
        return;
      }
      if (_file === "lsof") {
        lsofCall += 1;
        if (lsofCall === 1) {
          callback(null, { stdout: "123\n" });
          return;
        }
        callback(null, { stdout: "" });
        return;
      }
      callback(null, { stdout: "" });
    });

    const controller = new ZellijController({ session: "ignored", zellijBin: "zellij" });
    await expect(controller.deleteSession("alpha")).resolves.toBeUndefined();
    expect(killSpy).toHaveBeenCalledWith(123, "SIGTERM");
    expect(fs.existsSync(socketPath)).toBe(false);
    readdirSpy.mockRestore();
    lstatSpy.mockRestore();
  });
});
