import type { SyncConnectionState } from "../../lib/app-shell";

interface OfflineStatusBannerProps {
  state: Exclude<SyncConnectionState, "online">;
}

const bannerCopy: Record<Exclude<SyncConnectionState, "online">, { body: string; title: string }> = {
  offline: {
    title: "Offline mode simulated.",
    body: "Local edits remain available from browser storage while sync is paused."
  },
  reconnecting: {
    title: "Reconnecting to collaboration services.",
    body: "The editor is restoring local state and waiting for the live session to catch up."
  },
  recovered: {
    title: "Connection restored.",
    body: "Local draft state has been rehydrated and the workspace is ready to resume syncing."
  }
};

export function OfflineStatusBanner({ state }: OfflineStatusBannerProps) {
  const copy = bannerCopy[state];

  return (
    <div className="offline-banner" role="status">
      <strong>{copy.title}</strong>
      <span>{copy.body}</span>
    </div>
  );
}
