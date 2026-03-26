import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => fs.promises.rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe("runtime launchd install", () => {
  test("writes runtime plists to a stable worktree root outside the checkout", async () => {
    const tempHome = await fs.promises.mkdtemp(path.join(os.tmpdir(), "remux-runtime-launchd-test-"));
    tempDirs.push(tempHome);

    execFileSync("bash", ["scripts/install-launchd.sh"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOME: tempHome
      },
      stdio: "pipe"
    });

    const plistPath = path.join(tempHome, "Library", "LaunchAgents", "com.remux.dev.plist");
    const plist = await fs.promises.readFile(plistPath, "utf8");

    expect(plist).toContain(path.join(tempHome, ".remux", "runtime-worktrees", "runtime-dev"));
    expect(plist).not.toContain(path.join(process.cwd(), ".worktrees", "runtime-dev"));
  });
});
