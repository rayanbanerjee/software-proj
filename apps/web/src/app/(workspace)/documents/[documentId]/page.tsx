import { headers } from "next/headers";

import { DocumentWorkspaceShell } from "../../../../components/documents/document-workspace-shell";
import {
  applySyncPermissionState,
  applySyncViewOverride,
  getDocumentRecord,
  parseExportJobId,
  parseDocumentOverlay,
  parseDocumentScreenState,
  parseSyncConnectionState,
  parseSyncPermissionState,
  parseSyncStateVector
} from "../../../../lib/app-shell";
import { getExportPanelState } from "../../../../lib/export-panel-state";
import { getVersionHistoryEntries } from "../../../../lib/version-history";

type DocumentPageProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentPage({ params, searchParams }: DocumentPageProps) {
  const { documentId } = await params;
  const currentSearchParams = await searchParams;
  const permissionState = parseSyncPermissionState(currentSearchParams.permission);
  const document = applySyncPermissionState(getDocumentRecord(documentId), permissionState);
  const requestHeaders = await headers();
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
        serverStateVector={parseSyncStateVector(currentSearchParams.stateVector)}
        syncState={parseSyncConnectionState(currentSearchParams.sync)}
        versionHistoryEntries={versionHistoryEntries}
        view={applySyncViewOverride(parseDocumentScreenState(currentSearchParams.view), permissionState)}
      />
    </div>
  );
}
