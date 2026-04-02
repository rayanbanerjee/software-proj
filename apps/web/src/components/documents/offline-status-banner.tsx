import type { SyncConnectionState, SyncPermissionState } from "../../lib/app-shell";

interface OfflineStatusBannerProps {
  permissionState?: SyncPermissionState;
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

export function OfflineStatusBanner({
  permissionState = "normal",
  state
}: OfflineStatusBannerProps) {
  const copy = bannerCopy[state];
  const permissionSuffix = permissionState === "read-only"
    ? " Editing remains disabled because access changed while the client was offline."
    : permissionState === "revoked"
      ? " The document has moved into local recovery mode because access was revoked while offline."
      : "";

  return (
    <div className="offline-banner" role="status">
      <strong>{copy.title}</strong>
      <span>{`${copy.body}${permissionSuffix}`}</span>
    </div>
  );
}
