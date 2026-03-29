import { memo, useEffect, useMemo, useState } from "react";
import type { AiQuickAction, AiToolContext } from "../ai-tool-profile.js";

const COLLAPSED_PREFERENCE_KEY = "remux-ai-toolbar-collapsed";

const readCollapsedPreference = (): boolean =>
  globalThis.localStorage?.getItem?.(COLLAPSED_PREFERENCE_KEY) === "true";

interface AiQuickActionsBarProps {
  hidden?: boolean;
  onFocusTerminal: () => void;
  onSendRaw: (data: string) => void;
  tool: AiToolContext | null;
}

const buildActionPayload = (action: AiQuickAction): string =>
  action.submit ? `${action.payload}\r` : action.payload;

export const AiQuickActionsBar = memo(({
  hidden = false,
  onFocusTerminal,
  onSendRaw,
  tool
}: AiQuickActionsBarProps) => {
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);

  useEffect(() => {
    globalThis.localStorage?.setItem?.(COLLAPSED_PREFERENCE_KEY, collapsed ? "true" : "false");
  }, [collapsed]);

  useEffect(() => {
    if (!tool) {
      setDismissedSignature(null);
      return;
    }
    if (dismissedSignature && dismissedSignature !== tool.signature) {
      setDismissedSignature(null);
    }
  }, [dismissedSignature, tool]);

  const subtitle = useMemo(() => {
    if (!tool) {
      return "";
    }
    const segments = [tool.projectLabel, tool.pathLabel].filter(Boolean);
    return segments.join(" · ");
  }, [tool]);

  if (!tool || hidden || dismissedSignature === tool.signature) {
    return null;
  }

  return (
    <section className="ai-quick-actions" data-testid="ai-quick-actions">
      <div className="ai-quick-actions-header">
        <div className="ai-quick-actions-heading">
          <span className={`ai-tool-badge ai-tool-${tool.profile.id}`}>{tool.profile.label}</span>
          <div className="ai-quick-actions-copy">
            <strong>{tool.profile.description}</strong>
            {subtitle && <span>{subtitle}</span>}
          </div>
        </div>
        <div className="ai-quick-actions-controls">
          <button
            type="button"
            className="ai-quick-actions-toggle"
            data-action="collapse"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? "Show" : "Hide"}
          </button>
          <button
            type="button"
            className="ai-quick-actions-toggle"
            data-action="dismiss"
            onClick={() => setDismissedSignature(tool.signature)}
          >
            Dismiss
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="ai-quick-actions-row">
          {tool.profile.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`ai-quick-action-btn${action.tone ? ` ${action.tone}` : ""}`}
              data-action-id={action.id}
              onClick={() => {
                onSendRaw(buildActionPayload(action));
                onFocusTerminal();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
});
