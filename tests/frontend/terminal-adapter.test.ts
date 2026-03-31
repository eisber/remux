// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getPreferredBackend } from "../../src/frontend/terminal/terminal-adapter";

describe("getPreferredBackend", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  function setUrlParam(param: string) {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: param },
      writable: true,
    });
  }

  it("defaults to ghostty when no preference set", () => {
    setUrlParam("");
    expect(getPreferredBackend()).toBe("ghostty");
  });

  it("reads xterm from URL param", () => {
    setUrlParam("?terminal=xterm");
    expect(getPreferredBackend()).toBe("xterm");
  });

  it("reads ghostty from URL param", () => {
    setUrlParam("?terminal=ghostty");
    expect(getPreferredBackend()).toBe("ghostty");
  });

  it("reads xterm from localStorage when no URL param", () => {
    setUrlParam("");
    localStorage.setItem("terminalCore", "xterm");
    expect(getPreferredBackend()).toBe("xterm");
  });

  it("URL param takes priority over localStorage", () => {
    setUrlParam("?terminal=ghostty");
    localStorage.setItem("terminalCore", "xterm");
    expect(getPreferredBackend()).toBe("ghostty");
  });

  it("ignores unknown URL param values", () => {
    setUrlParam("?terminal=foo");
    expect(getPreferredBackend()).toBe("ghostty");
  });
});
