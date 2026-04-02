import Link from "next/link";

import { workspaceHighlights } from "../../lib/app-shell";
import { WorkspaceNav } from "./workspace-nav";

export function WorkspaceFrame({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="workspace-brand-block">
          <Link className="workspace-brand-mark" href="/documents">
            Collaborative Workspace
          </Link>
          <p className="workspace-brand-copy">
            Incremental product shells for auth, documents, collaboration, revisions, AI, and
            exports.
          </p>
        </div>

        <WorkspaceNav />

        <div className="workspace-highlight-list">
          {workspaceHighlights.map((item) => (
            <article className="workspace-highlight-card" key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div>
            <span className="workspace-kicker">Route Shells</span>
            <h1>Collaborative document product surface</h1>
          </div>
          <dl className="workspace-runtime-pills">
            <div>
              <dt>API</dt>
              <dd>Fastify</dd>
            </div>
            <div>
              <dt>Sessions</dt>
              <dd>Signed Cookie</dd>
            </div>
            <div>
              <dt>Realtime</dt>
              <dd>Yjs + Hocuspocus</dd>
            </div>
          </dl>
        </header>

        <div className="workspace-content">{children}</div>
      </div>
    </div>
  );
}
