import { headers } from "next/headers";

import { DocumentListShell } from "../../../components/documents/document-list-shell";
import { getWorkspaceDocumentsState } from "../../../lib/documents";

export default async function DocumentsPage() {
  const requestHeaders = await headers();
  const result = await getWorkspaceDocumentsState({
    cookieHeader: requestHeaders.get("cookie")
  });

  return (
    <div className="workspace-page-stack">
      <DocumentListShell authRequired={result.authRequired} documents={result.documents} />
    </div>
  );
}
