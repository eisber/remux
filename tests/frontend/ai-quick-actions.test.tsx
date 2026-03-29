// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AiQuickActionsBar } from "../../src/frontend/components/AiQuickActionsBar.js";
import { detectAiToolContext } from "../../src/frontend/ai-tool-profile.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const installMemoryStorage = (): void => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  });
};

describe("AiQuickActionsBar", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  test("renders tool-specific actions and sends terminal commands", () => {
    installMemoryStorage();
    const sendRaw = vi.fn();
    const focusTerminal = vi.fn();
    const tool = detectAiToolContext({
      index: 0,
      id: "pane-1",
      currentCommand: "codex",
      active: true,
      width: 120,
      height: 40,
      zoomed: false,
      currentPath: "/workspace/remux",
    });

    expect(tool).not.toBeNull();

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <AiQuickActionsBar
          hidden={false}
          onFocusTerminal={focusTerminal}
          onSendRaw={sendRaw}
          tool={tool}
        />
      );
    });

    const rail = container.querySelector("[data-testid='ai-quick-actions']");
    expect(rail?.textContent).toContain("Codex");
    expect(rail?.textContent).toContain("remux");

    act(() => {
      (container?.querySelector("button[data-action-id='model']") as HTMLButtonElement).click();
      (container?.querySelector("button[data-action-id='interrupt']") as HTMLButtonElement).click();
    });

    expect(sendRaw).toHaveBeenNthCalledWith(1, "/model\r");
    expect(sendRaw).toHaveBeenNthCalledWith(2, "\u0003");
    expect(focusTerminal).toHaveBeenCalledTimes(2);
  });

  test("dismisses the rail until the detected tool changes", () => {
    installMemoryStorage();
    const sendRaw = vi.fn();
    const focusTerminal = vi.fn();
    const codex = detectAiToolContext({
      index: 0,
      id: "pane-1",
      currentCommand: "codex",
      active: true,
      width: 120,
      height: 40,
      zoomed: false,
      currentPath: "/workspace/remux",
    });
    const claude = detectAiToolContext({
      index: 0,
      id: "pane-2",
      currentCommand: "claude",
      active: true,
      width: 120,
      height: 40,
      zoomed: false,
      currentPath: "/workspace/remux",
    });

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <AiQuickActionsBar
          hidden={false}
          onFocusTerminal={focusTerminal}
          onSendRaw={sendRaw}
          tool={codex}
        />
      );
    });

    act(() => {
      (container?.querySelector("button[data-action='dismiss']") as HTMLButtonElement).click();
    });
    expect(container?.querySelector("[data-testid='ai-quick-actions']")).toBeNull();

    act(() => {
      root?.render(
        <AiQuickActionsBar
          hidden={false}
          onFocusTerminal={focusTerminal}
          onSendRaw={sendRaw}
          tool={claude}
        />
      );
    });

    expect(container?.querySelector("[data-testid='ai-quick-actions']")?.textContent).toContain("Claude Code");
  });
});
