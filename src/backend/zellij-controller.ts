import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GLOBAL_COMMAND_TIMEOUT_MS = 5000;
const LSOF_TIMEOUT_MS = 2000;

// --- Zellij JSON types (from `list-tabs --json` and `list-panes --json`) ---

export interface ZellijTab {
  position: number;
  name: string;
  active: boolean;
  tab_id: number;
  is_fullscreen_active: boolean;
  is_sync_panes_active: boolean;
  are_floating_panes_visible: boolean;
  viewport_rows: number;
  viewport_columns: number;
  has_bell_notification: boolean;
}

export interface ZellijPane {
  id: number;
  is_plugin: boolean;
  is_focused: boolean;
  is_fullscreen: boolean;
  is_floating: boolean;
  is_suppressed: boolean;
  title: string;
  exited: boolean;
  pane_x: number;
  pane_y: number;
  pane_rows: number;
  pane_columns: number;
  pane_content_x: number;
  pane_content_y: number;
  pane_content_rows: number;
  pane_content_columns: number;
  cursor_coordinates_in_pane: [number, number] | null;
  terminal_command: string | null;
  pane_command: string | null;
  pane_cwd: string | null;
  plugin_url: string | null;
  tab_id: number;
  tab_position: number;
  tab_name: string;
}

// --- Remux workspace state (consumed by frontend) ---

export interface WorkspaceTab {
  index: number;
  name: string;
  active: boolean;
  isFullscreen: boolean;
  hasBell: boolean;
  panes: WorkspacePane[];
}

export interface WorkspacePane {
  id: string;
  focused: boolean;
  title: string;
  command: string | null;
  cwd: string | null;
  rows: number;
  cols: number;
  x: number;
  y: number;
}

export interface WorkspaceState {
  session: string;
  tabs: WorkspaceTab[];
  activeTabIndex: number;
}

export interface ZellijSessionInfo {
  name: string;
  createdAgo: string;
  isActive: boolean;
}

export interface ZellijControllerApi {
  queryWorkspaceState(): Promise<WorkspaceState>;
  newTab(name?: string): Promise<void>;
  closeTab(tabIndex: number): Promise<void>;
  goToTab(tabIndex: number): Promise<void>;
  renameTab(tabIndex: number, name: string): Promise<void>;
  newPane(direction: "right" | "down"): Promise<void>;
  closePane(): Promise<void>;
  toggleFullscreen(): Promise<void>;
  dumpScreen(full?: boolean): Promise<string>;
  dumpPaneScreen(paneId: string, full?: boolean): Promise<string>;
  renameSession(name: string): Promise<void>;
  listSessionsStructured(): Promise<ZellijSessionInfo[]>;
  killSession(name: string): Promise<void>;
  deleteSession(name: string): Promise<void>;
}

export interface ZellijControllerOptions {
  session: string;
  zellijBin?: string;
  logger?: Pick<Console, "log" | "error">;
}

export class ZellijController implements ZellijControllerApi {
  private session: string;
  private zellijBin: string;
  private logger: Pick<Console, "log" | "error">;

  constructor(options: ZellijControllerOptions) {
    this.session = options.session;
    this.zellijBin = options.zellijBin ?? "zellij";
    this.logger = options.logger ?? console;
  }

  // --- State queries ---

  async queryWorkspaceState(): Promise<WorkspaceState> {
    const [tabs, panes] = await Promise.all([
      this.queryTabs(),
      this.queryPanes(),
    ]);

    const terminalPanes = panes.filter((p) => !p.is_plugin && !p.is_suppressed);

    const workspaceTabs: WorkspaceTab[] = tabs.map((tab) => ({
      index: tab.position,
      name: tab.name,
      active: tab.active,
      isFullscreen: tab.is_fullscreen_active,
      hasBell: tab.has_bell_notification,
      panes: terminalPanes
        .filter((p) => p.tab_position === tab.position)
        .map((p) => ({
          id: `terminal_${p.id}`,
          focused: p.is_focused,
          title: p.title,
          command: p.pane_command ?? p.terminal_command,
          cwd: p.pane_cwd,
          rows: p.pane_content_rows,
          cols: p.pane_content_columns,
          x: p.pane_content_x,
          y: p.pane_content_y,
        })),
    }));

    const activeTab = tabs.find((t) => t.active);

    return {
      session: this.session,
      tabs: workspaceTabs,
      activeTabIndex: activeTab?.position ?? 0,
    };
  }

  async queryTabs(): Promise<ZellijTab[]> {
    const raw = await this.run(["action", "list-tabs", "--json", "--all", "--panes", "--state"]);
    return JSON.parse(raw) as ZellijTab[];
  }

  async queryPanes(): Promise<ZellijPane[]> {
    const raw = await this.run(["action", "list-panes", "--json", "--all", "--geometry", "--command", "--state"]);
    return JSON.parse(raw) as ZellijPane[];
  }

  // --- Tab operations ---

  async newTab(name?: string): Promise<void> {
    const args = ["action", "new-tab"];
    if (name) args.push("--name", name);
    await this.run(args);
  }

  async closeTab(tabIndex: number): Promise<void> {
    // Go to the tab first, then close it.
    await this.run(["action", "go-to-tab", String(tabIndex + 1)]);
    await this.run(["action", "close-tab"]);
  }

  async goToTab(tabIndex: number): Promise<void> {
    // Zellij tab indices are 1-based.
    await this.run(["action", "go-to-tab", String(tabIndex + 1)]);
  }

  async renameTab(tabIndex: number, name: string): Promise<void> {
    await this.run(["action", "go-to-tab", String(tabIndex + 1)]);
    await this.run(["action", "rename-tab", name]);
  }

  // --- Pane operations ---

  async newPane(direction: "right" | "down"): Promise<void> {
    await this.run(["action", "new-pane", "--direction", direction]);
  }

  async closePane(): Promise<void> {
    await this.run(["action", "close-pane"]);
  }

  async toggleFullscreen(): Promise<void> {
    await this.run(["action", "toggle-fullscreen"]);
  }

  // --- Inspect ---

  async dumpScreen(full = false): Promise<string> {
    const args = ["action", "dump-screen", "--ansi"];
    if (full) args.push("--full");
    return this.run(args);
  }

  async dumpPaneScreen(paneId: string, full = true): Promise<string> {
    const normalizedPaneId = paneId.startsWith("terminal_") || paneId.startsWith("plugin_")
      ? paneId
      : `terminal_${paneId}`;
    const args = ["action", "dump-screen", "--pane-id", normalizedPaneId];
    if (full) {
      args.push("--full");
    }
    return this.run(args);
  }

  // --- Session ---

  async renameSession(name: string): Promise<void> {
    await this.run(["action", "rename-session", name]);
    this.session = name;
  }

  async listSessions(): Promise<string[]> {
    try {
      const raw = await this.runGlobal(["list-sessions", "--no-formatting"]);
      return raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {
      return this.listSessionsFromSockets().map((session) => session.name);
    }
  }

  async listSessionsStructured(): Promise<ZellijSessionInfo[]> {
    try {
      const raw = await this.runGlobal(["list-sessions", "--no-formatting"]);
      const sessions = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return sessions.map((line) => {
        const match = line.match(/^(.*?)\s+\[Created\s+(.+?)\s+ago\](?:\s+\(EXITED.*\))?$/);
        if (!match) {
          return {
            name: line,
            createdAgo: "",
            isActive: !line.includes("(EXITED"),
          };
        }

        return {
          name: match[1].trim(),
          createdAgo: match[2].trim(),
          isActive: !line.includes("(EXITED"),
        };
      });
    } catch {
      return this.listSessionsFromSockets();
    }
  }

  async killSession(name: string): Promise<void> {
    try {
      await this.runGlobal(["kill-session", name]);
    } catch (error) {
      await this.forceRemoveSessionSocket(name, error);
    }
  }

  async deleteSession(name: string): Promise<void> {
    try {
      await this.runGlobal(["delete-session", "--force", name]);
    } catch (error) {
      await this.forceRemoveSessionSocket(name, error);
    }
  }

  // --- Internal ---

  private listSessionsFromSockets(): ZellijSessionInfo[] {
    const sessions = new Map<string, ZellijSessionInfo & { mtimeMs: number }>();

    for (const contractDir of this.resolveContractDirs()) {
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(contractDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isSocket() || entry.name === "web_server_bus") {
          continue;
        }

        const socketPath = path.join(contractDir, entry.name);
        let stats: fs.Stats;
        try {
          stats = fs.lstatSync(socketPath);
        } catch {
          continue;
        }

        const current = sessions.get(entry.name);
        if (current && current.mtimeMs >= stats.mtimeMs) {
          continue;
        }

        sessions.set(entry.name, {
          name: entry.name,
          createdAgo: formatSocketAge(stats.mtimeMs),
          isActive: true,
          mtimeMs: stats.mtimeMs,
        });
      }
    }

    return [...sessions.values()]
      .sort((left, right) => left.mtimeMs - right.mtimeMs)
      .map(({ mtimeMs: _mtimeMs, ...session }) => session);
  }

  private resolveContractDirs(): string[] {
    const uid = typeof process.getuid === "function" ? process.getuid() : process.env.UID;
    if (!uid) {
      return [];
    }

    const zellijRoot = path.join(os.tmpdir(), `zellij-${uid}`);
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(zellijRoot, { withFileTypes: true });
    } catch {
      return [];
    }

    return entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("contract_version_"))
      .map((entry) => path.join(zellijRoot, entry.name));
  }

  private resolveSessionSocketPath(name: string): string | null {
    for (const contractDir of this.resolveContractDirs()) {
      const socketPath = path.join(contractDir, name);
      try {
        if (fs.lstatSync(socketPath).isSocket()) {
          return socketPath;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  private async forceRemoveSessionSocket(name: string, originalError: unknown): Promise<void> {
    const socketPath = this.resolveSessionSocketPath(name);
    if (!socketPath) {
      throw originalError;
    }

    await this.signalSocketProcesses(socketPath, "SIGTERM");
    await delay(250);

    if (await this.hasSocketProcesses(socketPath)) {
      await this.signalSocketProcesses(socketPath, "SIGKILL");
      await delay(250);
    }

    if (!(await this.hasSocketProcesses(socketPath)) && fs.existsSync(socketPath)) {
      fs.rmSync(socketPath, { force: true });
    }

    if (fs.existsSync(socketPath)) {
      throw originalError;
    }
  }

  private async signalSocketProcesses(socketPath: string, signal: NodeJS.Signals): Promise<void> {
    const pids = await this.listSocketProcessIds(socketPath);
    for (const pid of pids) {
      try {
        process.kill(pid, signal);
      } catch {}
    }
  }

  private async hasSocketProcesses(socketPath: string): Promise<boolean> {
    return (await this.listSocketProcessIds(socketPath)).length > 0;
  }

  private async listSocketProcessIds(socketPath: string): Promise<number[]> {
    try {
      const { stdout } = await execFileAsync("lsof", ["-t", socketPath], { timeout: LSOF_TIMEOUT_MS });
      return stdout
        .split("\n")
        .map((line) => Number(line.trim()))
        .filter((pid) => Number.isInteger(pid) && pid > 0);
    } catch {
      return [];
    }
  }

  private async run(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync(this.zellijBin, ["-s", this.session, ...args], {
        timeout: GLOBAL_COMMAND_TIMEOUT_MS,
      });
      return stdout;
    } catch (err) {
      this.logger.error(`zellij ${args.join(" ")} failed:`, err);
      throw err;
    }
  }

  private async runGlobal(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync(this.zellijBin, args, { timeout: GLOBAL_COMMAND_TIMEOUT_MS });
      return stdout;
    } catch (err) {
      this.logger.error(`zellij ${args.join(" ")} failed:`, err);
      throw err;
    }
  }
}

const formatSocketAge = (mtimeMs: number): string => {
  const diffMs = Math.max(0, Date.now() - mtimeMs);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
};

const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
