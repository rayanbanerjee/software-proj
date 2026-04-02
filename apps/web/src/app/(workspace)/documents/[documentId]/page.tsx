import { headers } from "next/headers";

import { DocumentWorkspaceShell } from "../../../../components/documents/document-workspace-shell";
import {
  getDocumentRecord,
  parseExportJobId,
  parseDocumentOverlay,
  parseDocumentScreenState,
  parseSyncConnectionState
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
  const document = getDocumentRecord(documentId);
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
        syncState={parseSyncConnectionState(currentSearchParams.sync)}
        versionHistoryEntries={versionHistoryEntries}
        view={parseDocumentScreenState(currentSearchParams.view)}
      />
    </div>
  );
}
