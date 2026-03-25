import type { TopStatus } from "../app-status";
import type { BandwidthStats, ServerConfig } from "../app-types";

interface AppHeaderProps {
  activeTabLabel: string;
  awaitingSessionSelection: boolean;
  bandwidthStats: BandwidthStats | null;
  onToggleDrawer: () => void;
  onToggleStats: () => void;
  onToggleViewMode: () => void;
  serverConfig: ServerConfig | null;
  topStatus: TopStatus;
  viewMode: "scroll" | "terminal";
  supportsPreciseScrollback: boolean;
  formatBytes: (bytes: number) => string;
}

export const AppHeader = ({
  activeTabLabel,
  awaitingSessionSelection,
  bandwidthStats,
  onToggleDrawer,
  onToggleStats,
  onToggleViewMode,
  serverConfig,
  topStatus,
  viewMode,
  supportsPreciseScrollback,
  formatBytes
}: AppHeaderProps) => (
  <header className="tab-bar">
    <button
      onClick={onToggleDrawer}
      className="tab-bar-burger"
      data-testid="drawer-toggle"
      title="Open sidebar — manage panes, themes, and advanced options"
    >
      ☰
    </button>
    <div className="top-title">
      {awaitingSessionSelection ? "Select Session" : `Tab: ${activeTabLabel}`}
      {serverConfig?.backendKind === "zellij" && (
        <span className="experimental-badge" title="Zellij support is experimental">(experimental)</span>
      )}
    </div>
    <div className="tab-bar-actions">
      <span
        className={`top-status ${topStatus.kind}`}
        title={topStatus.label}
        aria-label={`Status: ${topStatus.label}`}
        data-testid="top-status-indicator"
      />
      {bandwidthStats && (
        <button
          className={`bandwidth-indicator ${bandwidthStats.savedPercent > 50 ? "good" : bandwidthStats.savedPercent > 20 ? "ok" : "low"}`}
          onClick={onToggleStats}
          title={`Bandwidth: ${formatBytes(bandwidthStats.compressedBytesPerSec)}/s (${bandwidthStats.savedPercent}% saved). Click for details.`}
        >
          ↓{formatBytes(bandwidthStats.compressedBytesPerSec)}/s
          {bandwidthStats.savedPercent > 0 && <span className="saved-badge">{bandwidthStats.savedPercent}%</span>}
        </button>
      )}
      <button
        className={`top-btn${viewMode === "terminal" ? " active" : ""}`}
        title="Toggle between terminal view and scrollback history"
        onClick={onToggleViewMode}
      >
        {viewMode === "scroll" ? "Term" : "Scroll"}
        {viewMode === "scroll" && !supportsPreciseScrollback && (
          <span className="experimental-badge" title="Scrollback is approximate for this backend"> (approx)</span>
        )}
      </button>
    </div>
  </header>
);
