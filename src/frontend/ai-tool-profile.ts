import type { PaneState } from "../shared/protocol.js";

export interface AiQuickAction {
  id: string;
  label: string;
  payload: string;
  submit: boolean;
  tone?: "default" | "accent" | "danger";
}

export interface AiToolProfile {
  id: "codex" | "claude-code";
  label: string;
  description: string;
  actions: AiQuickAction[];
}

export interface AiToolContext {
  command: string;
  detectionSource: "pane-command" | "viewport";
  normalizedCommand: string;
  paneId: string;
  pathLabel: string;
  profile: AiToolProfile;
  projectLabel: string;
  signature: string;
}

const homeDirectoryPattern = /^\/(Users|home)\/[^/]+\/?$/;

const normalizeCommand = (command: string): string => {
  const token = command.trim().split(/\s+/)[0] ?? "";
  const basename = token.split(/[\\/]/u).at(-1)?.toLowerCase() ?? "";
  return basename.replace(/\.exe$/u, "");
};

const derivePathLabel = (currentPath: string): string => {
  if (!currentPath) {
    return "";
  }
  if (currentPath === "/") {
    return "/";
  }
  if (homeDirectoryPattern.test(currentPath)) {
    return "~";
  }
  return currentPath;
};

const deriveProjectLabel = (currentPath: string): string => {
  if (!currentPath) {
    return "";
  }
  if (currentPath === "/") {
    return "/";
  }
  if (homeDirectoryPattern.test(currentPath)) {
    return "~";
  }

  const parts = currentPath.split("/").filter(Boolean);
  return parts.at(-1) ?? currentPath;
};

const sharedActions: AiQuickAction[] = [
  {
    id: "interrupt",
    label: "Interrupt",
    payload: "\u0003",
    submit: false,
    tone: "danger",
  },
  {
    id: "escape",
    label: "Esc",
    payload: "\u001b",
    submit: false,
  },
];

const codexProfile: AiToolProfile = {
  id: "codex",
  label: "Codex",
  description: "OpenAI coding agent",
  actions: [
    {
      id: "model",
      label: "Model",
      payload: "/model",
      submit: true,
      tone: "accent",
    },
    {
      id: "approvals",
      label: "Approvals",
      payload: "/approvals",
      submit: true,
    },
    {
      id: "status",
      label: "Status",
      payload: "/status",
      submit: true,
    },
    ...sharedActions,
  ],
};

const claudeCodeProfile: AiToolProfile = {
  id: "claude-code",
  label: "Claude Code",
  description: "Anthropic coding agent",
  actions: [
    {
      id: "model",
      label: "Model",
      payload: "/model",
      submit: true,
      tone: "accent",
    },
    {
      id: "permissions",
      label: "Permissions",
      payload: "/permissions",
      submit: true,
    },
    {
      id: "status",
      label: "Status",
      payload: "/status",
      submit: true,
    },
    ...sharedActions,
  ],
};

const resolveProfile = (command: string): AiToolProfile | null => {
  if (command === "codex") {
    return codexProfile;
  }
  if (command === "claude" || command === "claude-code") {
    return claudeCodeProfile;
  }
  return null;
};

const buildAiToolContext = (
  pane: PaneState,
  profile: AiToolProfile,
  normalizedCommand: string,
  detectionSource: AiToolContext["detectionSource"],
): AiToolContext => ({
  command: pane.currentCommand,
  detectionSource,
  normalizedCommand,
  paneId: pane.id,
  pathLabel: derivePathLabel(pane.currentPath),
  profile,
  projectLabel: deriveProjectLabel(pane.currentPath),
  signature: `${profile.id}:${pane.id}:${pane.currentCommand}:${detectionSource}`,
});

export const detectAiToolProfileFromTerminalText = (text: string): AiToolProfile | null => {
  const normalizedText = text.toLowerCase();

  const matchesCodexTrustPrompt = normalizedText.includes("do you trust the contents of this directory?")
    && normalizedText.includes("higher risk of prompt injection");
  if (matchesCodexTrustPrompt || normalizedText.includes("openai codex")) {
    return codexProfile;
  }

  const matchesClaudeBanner = normalizedText.includes("claude code");
  const matchesClaudePrompt = normalizedText.includes("/permissions")
    && normalizedText.includes("/model")
    && normalizedText.includes("esc to interrupt");
  if (matchesClaudeBanner || matchesClaudePrompt) {
    return claudeCodeProfile;
  }

  return null;
};

export const detectAiToolContext = (pane: PaneState | null | undefined): AiToolContext | null => {
  if (!pane) {
    return null;
  }

  const normalizedCommand = normalizeCommand(pane.currentCommand);
  const profile = resolveProfile(normalizedCommand);
  if (!profile) {
    return null;
  }

  return buildAiToolContext(pane, profile, normalizedCommand, "pane-command");
};

export const detectAiToolContextFromViewport = (
  pane: PaneState | null | undefined,
  text: string,
): AiToolContext | null => {
  if (!pane) {
    return null;
  }

  const normalizedCommand = normalizeCommand(pane.currentCommand);
  const profile = resolveProfile(normalizedCommand) ?? detectAiToolProfileFromTerminalText(text);
  if (!profile) {
    return null;
  }

  return buildAiToolContext(
    pane,
    profile,
    normalizedCommand || "shell",
    resolveProfile(normalizedCommand) ? "pane-command" : "viewport",
  );
};
