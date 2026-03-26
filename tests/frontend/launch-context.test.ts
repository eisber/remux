import { describe, expect, test } from "vitest";
import { parseLaunchContext } from "../../src/frontend/launch-context.js";

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
});
