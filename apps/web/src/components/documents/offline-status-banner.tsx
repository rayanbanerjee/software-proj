export function OfflineStatusBanner() {
  return (
    <div className="offline-banner" role="status">
      <strong>Offline mode simulated.</strong>
      <span>Local edits are paused in this shell until reconnect handling lands in the sync tasks.</span>
    </div>
  );
}
