import { headers } from "next/headers";

import { DocumentWorkspaceShell } from "../../../../components/documents/document-workspace-shell";
import {
  applySyncPermissionState,
  applySyncViewOverride,
  parseExportJobId,
  parseDocumentOverlay,
  parseDocumentScreenState,
  parseSyncConnectionState,
  parseSyncPermissionState,
  parseSyncStateVector
} from "../../../../lib/app-shell";
import { getWorkspaceDocumentRecord } from "../../../../lib/documents";
import { getExportPanelState } from "../../../../lib/export-panel-state";
import { getVersionHistoryEntries } from "../../../../lib/version-history";

type DocumentPageProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentPage({ params, searchParams }: DocumentPageProps) {
  const { documentId } = await params;
  const currentSearchParams = await searchParams;
  const showDebugControls = currentSearchParams.debug === "1";
  const permissionState = parseSyncPermissionState(currentSearchParams.permission);
  const requestHeaders = await headers();
  const record = await getWorkspaceDocumentRecord(documentId, {
      cookieHeader: requestHeaders.get("cookie")
    });
  const document = applySyncPermissionState(record.document, permissionState);
  const versionHistoryEntries = await getVersionHistoryEntries(documentId, {
    cookieHeader: requestHeaders.get("cookie")
  });
  const exportPanelState = await getExportPanelState(documentId, {
    cookieHeader: requestHeaders.get("cookie"),
    exportJobId: parseExportJobId(currentSearchParams.exportJobId)
  });

  return (
    <div className="workspace-page-stack">
      <DocumentWorkspaceShell
        document={document}
        exportPanelState={exportPanelState}
        overlay={parseDocumentOverlay(currentSearchParams.overlay)}
        permissionState={permissionState}
        realtimeDocumentId={record.isMissing ? null : document.id}
        serverStateVector={parseSyncStateVector(currentSearchParams.stateVector)}
        showDebugControls={showDebugControls}
        syncState={parseSyncConnectionState(currentSearchParams.sync)}
        versionHistoryEntries={versionHistoryEntries}
        view={record.isMissing
          ? "error"
          : applySyncViewOverride(parseDocumentScreenState(currentSearchParams.view), permissionState)}
      />
    </div>
  );
}
