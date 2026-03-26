import type { SessionSummary } from "../../shared/protocol";

interface SessionPickerOverlayProps {
  mobileLayout: boolean;
  onSelectSession: (sessionName: string) => void;
  sessions: SessionSummary[] | null;
}

const SessionPickerOverlay = ({ mobileLayout, onSelectSession, sessions }: SessionPickerOverlayProps) => {
  if (!sessions) {
    return null;
  }

  return (
    <div className={`overlay${mobileLayout ? " overlay-sheet" : ""}`} data-testid="session-picker-overlay">
      <div className={`card${mobileLayout ? " card-sheet" : ""}`}>
        <h2>Select Session</h2>
        {sessions.map((session) => (
          <button
            key={session.name}
            onClick={() => onSelectSession(session.name)}
          >
            {session.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SessionPickerOverlay;
