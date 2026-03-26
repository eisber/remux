import { useEffect, useRef, type RefObject } from "react";
import { ansiToHtml } from "../ansi-to-html";

interface UseScrollbackViewOptions {
  authReady: boolean;
  scrollViewActive: boolean;
  scrollbackContentRef: RefObject<HTMLDivElement | null>;
  scrollbackText: string;
}

export const useScrollbackView = ({
  authReady,
  scrollViewActive,
  scrollbackContentRef,
  scrollbackText
}: UseScrollbackViewOptions): void => {
  const lastHtmlRef = useRef("");

  useEffect(() => {
    if (!scrollViewActive || !authReady) {
      return;
    }

    const el = scrollbackContentRef.current;
    if (!el) {
      return;
    }

    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
    const nextHtml = scrollbackText ? ansiToHtml(scrollbackText) : "";
    if (nextHtml === lastHtmlRef.current) {
      return;
    }

    lastHtmlRef.current = nextHtml;
    el.innerHTML = nextHtml;
    if (isAtBottom || !scrollbackText) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [authReady, scrollViewActive, scrollbackContentRef, scrollbackText]);
};
