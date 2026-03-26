import { describe, expect, test } from "vitest";
import { buildControlAuthHint, parseLaunchContext } from "../../src/frontend/launch-context.js";

describe("frontend launch context", () => {
  test("parses session, tab, and pane hints from the URL", () => {
    expect(parseLaunchContext(new URLSearchParams("session=work&tab=2&pane=%252"))).toEqual({
      session: "work",
      tabIndex: 2,
      paneId: "%2"
    });
  });

  test("ignores invalid tab hint and requires a session", () => {
    expect(parseLaunchContext(new URLSearchParams("tab=abc&pane=%252"))).toBeNull();
    expect(parseLaunchContext(new URLSearchParams("session=work&tab=-1"))).toEqual({
      session: "work"
    });
  });

  test("prefers initial launch context and otherwise falls back to attached session", () => {
    expect(buildControlAuthHint("main", { session: "work", tabIndex: 2, paneId: "%2" })).toEqual({
      session: "work",
      tabIndex: 2,
      paneId: "%2"
    });
    expect(buildControlAuthHint("main", null)).toEqual({ session: "main" });
    expect(buildControlAuthHint("", null)).toBeNull();
  });
});
