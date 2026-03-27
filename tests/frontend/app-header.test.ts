import { describe, expect, test } from "vitest";
import {
  describeRuntimeState,
  formatInspectPrecisionBadge,
} from "../../src/frontend/components/AppHeader.js";

describe("app header runtime badges", () => {
  test("describes native bridge state explicitly", () => {
    expect(
      describeRuntimeState({
        streamMode: "native-bridge",
        scrollbackPrecision: "precise",
      })
    ).toEqual({
      className: "stream-badge native",
      label: "native bridge",
      title: "Using the native zellij bridge for live frames and precise scrollback",
    });
  });

  test("describes CLI fallback state with degraded reason", () => {
    expect(
      describeRuntimeState({
        streamMode: "cli-polling",
        degradedReason: "bridge_crashed",
        scrollbackPrecision: "approximate",
      })
    ).toEqual({
      className: "stream-badge degraded",
      label: "CLI fallback",
      title: "Native bridge unavailable (bridge_crashed) - using CLI fallback",
    });
  });

  test("formats inspect precision badge from real snapshot precision", () => {
    expect(formatInspectPrecisionBadge("precise")).toBeNull();
    expect(formatInspectPrecisionBadge("approximate")).toBe("approx");
    expect(formatInspectPrecisionBadge("partial")).toBe("partial");
  });
});
