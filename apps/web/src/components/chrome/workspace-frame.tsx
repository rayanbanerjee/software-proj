import Link from "next/link";
import { headers } from "next/headers";

import { getWorkspaceDocuments } from "../../lib/documents";
import { WorkspaceActivityRail } from "./workspace-activity-rail";
import { WorkspaceNav } from "./workspace-nav";

export async function WorkspaceFrame({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const documents = await getWorkspaceDocuments({
    cookieHeader: requestHeaders.get("cookie")
  });

  return (
    <div className="workspace-shell">
      <WorkspaceActivityRail />

      <aside className="workspace-sidebar">
        <div className="workspace-brand-block">
          <span className="workspace-brand-badge">Workspace</span>
          <Link className="workspace-brand-mark" href="/documents">Notes</Link>
        </div>

        <WorkspaceNav documents={documents} />
      </aside>

      <div className="workspace-main">
        <div className="workspace-content">{children}</div>
      </div>
    </div>
  );
}
