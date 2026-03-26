import { useEffect, useState } from "react";

export const MOBILE_LAYOUT_MEDIA_QUERY = "(max-width: 768px), ((pointer: coarse) and (max-height: 560px))";

const readViewportWidth = (): number =>
  Math.round(window.visualViewport?.width ?? window.innerWidth);

const readViewportHeight = (): number =>
  Math.round(window.visualViewport?.height ?? window.innerHeight);

export const matchesMobileLayout = (): boolean =>
  window.matchMedia(MOBILE_LAYOUT_MEDIA_QUERY).matches;

interface ViewportLayoutState {
  mobileLandscape: boolean;
  mobileLayout: boolean;
  viewportHeight: number;
  viewportWidth: number;
}

const readViewportLayout = (): ViewportLayoutState => {
  const viewportWidth = readViewportWidth();
  const viewportHeight = readViewportHeight();
  const mobileLayout = matchesMobileLayout();

  return {
    mobileLandscape: mobileLayout && viewportWidth > viewportHeight,
    mobileLayout,
    viewportHeight,
    viewportWidth
  };
};

export const useViewportLayout = (): ViewportLayoutState => {
  const [layout, setLayout] = useState<ViewportLayoutState>(() => readViewportLayout());

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_MEDIA_QUERY);
    const visualViewport = window.visualViewport;
    const syncLayout = () => setLayout(readViewportLayout());

    syncLayout();

    const removeMediaListener = (() => {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", syncLayout);
        return () => mediaQuery.removeEventListener("change", syncLayout);
      }

      mediaQuery.addListener(syncLayout);
      return () => mediaQuery.removeListener(syncLayout);
    })();

    window.addEventListener("resize", syncLayout);
    visualViewport?.addEventListener("resize", syncLayout);

    return () => {
      removeMediaListener();
      window.removeEventListener("resize", syncLayout);
      visualViewport?.removeEventListener("resize", syncLayout);
    };
  }, []);

  return layout;
};
