import { execFileSync } from "node:child_process";

export interface LaunchContext {
  session: string;
  tabIndex?: number;
  paneId?: string;
}

export const parseTmuxLaunchContext = (raw: string): LaunchContext | null => {
  const [session, tabIndexRaw, paneId] = raw.trim().split("\t");
  if (!session) {
    return null;
  }

  const context: LaunchContext = { session };
  const tabIndex = Number.parseInt(tabIndexRaw ?? "", 10);
  if (Number.isInteger(tabIndex) && tabIndex >= 0) {
    context.tabIndex = tabIndex;
  }
  if (paneId) {
    context.paneId = paneId;
  }

  return context;
};

export const detectTmuxLaunchContext = (options?: {
  backendKind?: "tmux" | "zellij" | "conpty";
  env?: NodeJS.ProcessEnv;
  execFile?: typeof execFileSync;
}): LaunchContext | null => {
  if (options?.backendKind !== "tmux") {
    return null;
  }

  const env = options.env ?? process.env;
  if (!env.TMUX) {
    return null;
  }

  try {
    const execFile = options.execFile ?? execFileSync;
    const raw = execFile(
      "tmux",
      ["display-message", "-p", "#S\t#I\t#D"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    return parseTmuxLaunchContext(raw);
  } catch {
    return null;
  }
};

export const buildLaunchUrl = (
  baseUrl: string,
  token: string,
  context?: LaunchContext | null
): string => {
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  if (context?.session) {
    url.searchParams.set("session", context.session);
  }
  if (context?.tabIndex !== undefined) {
    url.searchParams.set("tab", String(context.tabIndex));
  }
  if (context?.paneId) {
    url.searchParams.set("pane", context.paneId);
  }
  return url.toString();
};
