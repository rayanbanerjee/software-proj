import { DocumentWorkspaceShell } from "../../../../components/documents/document-workspace-shell";
import {
  getDocumentRecord,
  parseDocumentOverlay,
  parseDocumentScreenState,
  parseOfflineFlag
} from "../../../../lib/app-shell";

type DocumentPageProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentPage({ params, searchParams }: DocumentPageProps) {
  const { documentId } = await params;
  const currentSearchParams = await searchParams;
  const document = getDocumentRecord(documentId);

  return (
    <div className="workspace-page-stack">
      <DocumentWorkspaceShell
        document={document}
        offline={parseOfflineFlag(currentSearchParams.offline)}
        overlay={parseDocumentOverlay(currentSearchParams.overlay)}
        view={parseDocumentScreenState(currentSearchParams.view)}
      />
    </div>
  );
}
