import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { afterEach, describe, expect, test } from "vitest";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => fs.promises.rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe("zellij web bootstrap", () => {
  test("writes a launchd plist that starts the configured zellij web daemon", async () => {
    const tempHome = await fs.promises.mkdtemp(path.join(os.tmpdir(), "remux-zellij-launchd-test-"));
    tempDirs.push(tempHome);

    const fakeBinDir = path.join(tempHome, "bin");
    const fakeZellij = path.join(fakeBinDir, "zellij");
    const configPath = path.join(tempHome, ".config", "zellij", "config.kdl");

    await fs.promises.mkdir(fakeBinDir, { recursive: true });
    await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
    await fs.promises.writeFile(fakeZellij, "#!/bin/bash\nexit 0\n", { mode: 0o755 });
    await fs.promises.writeFile(configPath, "web_server true\n");

    execFileSync("bash", ["scripts/install-zellij-web-launchd.sh"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOME: tempHome,
        PATH: `${fakeBinDir}:${process.env.PATH ?? ""}`,
        REMUX_ZELLIJ_BIN: fakeZellij,
        REMUX_ZELLIJ_CONFIG: configPath
      },
      stdio: "pipe"
    });

    const plistPath = path.join(tempHome, "Library", "LaunchAgents", "com.remux.zellij-web.plist");
    const plist = await fs.promises.readFile(plistPath, "utf8");

    expect(plist).toContain("<string>com.remux.zellij-web</string>");
    expect(plist).toContain(fakeZellij);
    expect(plist).toContain(configPath);
    expect(plist).toContain("<string>web</string>");
    expect(plist).toContain("<string>--daemonize</string>");
    expect(plist).toContain("<string>/tmp/remux-zellij-web.log</string>");
  });

  test("prints the stable local and public zellij entrypoints", async () => {
    const tempHome = await fs.promises.mkdtemp(path.join(os.tmpdir(), "remux-zellij-status-test-"));
    tempDirs.push(tempHome);

    const fakeBinDir = path.join(tempHome, "bin");
    const fakeZellij = path.join(fakeBinDir, "zellij");

    await fs.promises.mkdir(fakeBinDir, { recursive: true });
    await fs.promises.writeFile(
      fakeZellij,
      "#!/bin/bash\nif [[ \"$1\" == \"web\" && \"$2\" == \"--status\" ]]; then\n  echo 'Web server is online, checked: https://0.0.0.0:8082'\n  exit 0\nfi\nexit 0\n",
      { mode: 0o755 }
    );

    const output = execFileSync("bash", ["scripts/zellij-web-status.sh"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOME: tempHome,
        PATH: `${fakeBinDir}:${process.env.PATH ?? ""}`,
        REMUX_ZELLIJ_BIN: fakeZellij,
        REMUX_ZELLIJ_PUBLIC_URL: "https://zellij.yaoshen.wang",
        REMUX_ZELLIJ_SESSION_NAME: "remux-z"
      },
      encoding: "utf8",
      stdio: "pipe"
    });

    expect(output).toContain("https://127.0.0.1:8082/remux-z");
    expect(output).toContain("https://zellij.yaoshen.wang/remux-z");
    expect(output).toContain("npm run zellij:web:create-token");
  });

  test("does not try to daemonize again when the configured port is already listening", async () => {
    const tempHome = await fs.promises.mkdtemp(path.join(os.tmpdir(), "remux-zellij-start-test-"));
    tempDirs.push(tempHome);

    const fakeBinDir = path.join(tempHome, "bin");
    const fakeZellij = path.join(fakeBinDir, "zellij");
    const configPath = path.join(tempHome, ".config", "zellij", "config.kdl");
    const markerPath = path.join(tempHome, "daemonize-called");
    const server = net.createServer();

    await fs.promises.mkdir(fakeBinDir, { recursive: true });
    await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
    await fs.promises.writeFile(configPath, "web_server true\n");
    await fs.promises.writeFile(
      fakeZellij,
      `#!/bin/bash
set -euo pipefail
if [[ "$1" == "web" && "$2" == "--status" ]]; then
  echo 'Web server is offline, checked: https://0.0.0.0:8082'
  exit 0
fi
if [[ "$1" == "--config" ]]; then
  echo daemonize >> "${markerPath}"
  exit 42
fi
if [[ "$1" == "attach" ]]; then
  exit 0
fi
exit 0
`,
      { mode: 0o755 }
    );

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("failed to allocate test port");
    }

    try {
      const output = execFileSync("bash", ["scripts/zellij-web-start.sh"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          HOME: tempHome,
          PATH: `${fakeBinDir}:${process.env.PATH ?? ""}`,
          REMUX_ZELLIJ_BIN: fakeZellij,
          REMUX_ZELLIJ_CONFIG: configPath,
          REMUX_ZELLIJ_PORT: String(address.port),
          REMUX_ZELLIJ_PUBLIC_URL: "https://zellij.yaoshen.wang",
          REMUX_ZELLIJ_SESSION_NAME: "remux-z"
        },
        encoding: "utf8",
        stdio: "pipe"
      });

      expect(output).toContain(`https://127.0.0.1:${address.port}/remux-z`);
      await expect(fs.promises.stat(markerPath)).rejects.toThrow();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
