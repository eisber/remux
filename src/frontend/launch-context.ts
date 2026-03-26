export interface LaunchContextHint {
  session: string;
  tabIndex?: number;
  paneId?: string;
}

export const buildControlAuthHint = (
  attachedSession: string,
  initialContext: LaunchContextHint | null
): LaunchContextHint | { session: string } | null => {
  if (initialContext?.session) {
    return initialContext;
  }

  const session = attachedSession.trim();
  if (!session) {
    return null;
  }

  return { session };
};

export const parseLaunchContext = (
  query: URLSearchParams
): LaunchContextHint | null => {
  const session = query.get("session")?.trim() ?? "";
  if (!session) {
    return null;
  }

  const context: LaunchContextHint = { session };
  const tabRaw = query.get("tab");
  if (tabRaw !== null) {
    const tabIndex = Number.parseInt(tabRaw, 10);
    if (Number.isInteger(tabIndex) && tabIndex >= 0) {
      context.tabIndex = tabIndex;
    }
  }

  const paneId = query.get("pane")?.trim();
  if (paneId) {
    context.paneId = paneId;
  }

  return context;
};
