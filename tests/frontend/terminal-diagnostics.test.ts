import { describe, expect, test } from "vitest";
import {
  detectTerminalRedlines,
  type TerminalDiagnosticAction,
  type TerminalDiagnosticSample
} from "../../src/frontend/terminal-diagnostics.js";

const buildAction = (label: string): TerminalDiagnosticAction => ({
  at: "2026-03-30T00:00:00.000Z",
  label,
  type: "ui.click"
});

const buildSample = (
  overrides: Partial<TerminalDiagnosticSample> = {}
): TerminalDiagnosticSample => ({
  sampledAt: "2026-03-30T00:00:05.000Z",
  theme: "dark",
  viewMode: "terminal",
  terminalViewState: "live",
  appRect: { left: 0, top: 0, width: 1280, height: 720 },
  hostRect: { left: 0, top: 0, width: 1200, height: 640 },
  screenRect: { left: 0, top: 0, width: 1200, height: 640 },
  viewportRect: { left: 0, top: 0, width: 1200, height: 640 },
  frontendGeometry: { cols: 120, rows: 40 },
  backendGeometry: { cols: 120, rows: 40 },
  backgroundColor: "#111827",
  foregroundColor: "#d1e4ff",
  terminalBackgroundColor: "#111827",
  terminalForegroundColor: "#d1e4ff",
  contrastRatio: 11.8,
  bufferLineCount: 120,
  bufferTail: ["LINE-117", "LINE-118", "LINE-119", "LINE-120"],
  lastResizeSource: "fit",
  ...overrides
});

describe("detectTerminalRedlines", () => {
  test("flags terminal width drift when frontend and backend geometry diverge past the red line", () => {
    const findings = detectTerminalRedlines({
      current: buildSample({
        frontendGeometry: { cols: 58, rows: 40 },
        backendGeometry: { cols: 118, rows: 40 },
        hostRect: { left: 0, top: 0, width: 1180, height: 640 },
      }),
      previous: buildSample(),
      recentActions: [buildAction("Collapse sidebar")],
      protectedBufferMarkers: ["LINE-119", "LINE-120"],
      historyGapSuppressed: false
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "width_mismatch",
          severity: "error",
          recentActions: expect.arrayContaining([expect.objectContaining({ label: "Collapse sidebar" })]),
        })
      ])
    );
  });

  test("flags layout misalignment when the rendered xterm surface drifts away from the host bounds", () => {
    const findings = detectTerminalRedlines({
      current: buildSample({
        screenRect: { left: 48, top: 16, width: 612, height: 640 },
        viewportRect: { left: 48, top: 16, width: 612, height: 640 },
      }),
      previous: buildSample(),
      recentActions: [buildAction("Switch to tab 1")],
      protectedBufferMarkers: ["LINE-119", "LINE-120"],
      historyGapSuppressed: false
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "layout_misalignment",
          severity: "error",
        })
      ])
    );
  });

  test("flags whiteout when terminal foreground and background contrast collapses", () => {
    const findings = detectTerminalRedlines({
      current: buildSample({
        backgroundColor: "#ffffff",
        foregroundColor: "#ffffff",
        terminalBackgroundColor: "#ffffff",
        terminalForegroundColor: "#ffffff",
        contrastRatio: 1.01
      }),
      previous: buildSample(),
      recentActions: [buildAction("Toggle theme")],
      protectedBufferMarkers: ["LINE-119", "LINE-120"],
      historyGapSuppressed: false
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "color_whiteout",
          severity: "error",
        })
      ])
    );
  });

  test("flags history gaps when protected recent markers disappear without an expected reset", () => {
    const findings = detectTerminalRedlines({
      current: buildSample({
        bufferLineCount: 32,
        bufferTail: ["LIVE-001", "LIVE-002", "LIVE-003"]
      }),
      previous: buildSample({
        bufferLineCount: 128,
        bufferTail: ["KEEP-117", "KEEP-118", "KEEP-119", "KEEP-120"]
      }),
      recentActions: [buildAction("Refresh browser tab")],
      protectedBufferMarkers: ["KEEP-118", "KEEP-119", "KEEP-120"],
      historyGapSuppressed: false
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "history_gap",
          severity: "error",
          recentActions: expect.arrayContaining([expect.objectContaining({ label: "Refresh browser tab" })]),
        })
      ])
    );
  });

  test("does not flag history gaps while a deliberate terminal reset is in progress", () => {
    const findings = detectTerminalRedlines({
      current: buildSample({
        bufferLineCount: 8,
        bufferTail: ["NEW-1", "NEW-2"]
      }),
      previous: buildSample({
        bufferLineCount: 140,
        bufferTail: ["KEEP-138", "KEEP-139", "KEEP-140"]
      }),
      recentActions: [buildAction("Switch session")],
      protectedBufferMarkers: ["KEEP-138", "KEEP-139", "KEEP-140"],
      historyGapSuppressed: true
    });

    expect(findings.map((finding) => finding.kind)).not.toContain("history_gap");
  });
});
