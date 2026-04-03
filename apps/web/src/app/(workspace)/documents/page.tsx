import { headers } from "next/headers";

import { DocumentListShell } from "../../../components/documents/document-list-shell";
import { getWorkspaceDocuments } from "../../../lib/documents";

export default async function DocumentsPage() {
  const requestHeaders = await headers();
  const documents = await getWorkspaceDocuments({
    cookieHeader: requestHeaders.get("cookie")
  });

  return (
    <div className="workspace-page-stack">
      <DocumentListShell documents={documents} />
    </div>
  );
}
