"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  type DocumentRecord
} from "../../lib/app-shell";

interface WorkspaceNavProps {
  authRequired?: boolean;
  documents: DocumentRecord[];
}

export function WorkspaceNav({ authRequired = false, documents }: WorkspaceNavProps) {
  const pathname = usePathname();
  const recentFiles = documents.slice(0, 8);

  return (
    <nav className="workspace-nav" aria-label="Workspace navigation">
      <div className="workspace-nav-section">
        <div className="workspace-nav-heading">
          <span>Documents</span>
          <small>{documents.length}</small>
        </div>
        <Link
          className={`workspace-nav-link workspace-nav-link-home${pathname === "/documents" ? " workspace-nav-link-active" : ""}`}
          href="/documents"
        >
          <span className="workspace-folder-icon" aria-hidden="true" />
          <span>All documents</span>
          <small>Create, open, and manage documents</small>
        </Link>
        <div className="workspace-folder-label">
          <span className="workspace-folder-icon" aria-hidden="true" />
          <span>Shared space</span>
        </div>
        {recentFiles.map((document) => {
          const href = `/documents/${document.id}`;
          const isActive = pathname === href;

          return (
            <Link
              className={`workspace-nav-link${isActive ? " workspace-nav-link-active" : ""}`}
              href={href}
              key={href}
            >
              <span className="workspace-nav-link-icon" aria-hidden="true" />
              <span>{document.title}</span>
              <small>{document.updatedLabel}</small>
            </Link>
          );
        })}
      </div>

      <div className="workspace-settings-panel">
        <div className="workspace-nav-section">
          <div className="workspace-nav-heading">
            <span>Account</span>
          </div>
          <Link
            className={`workspace-nav-link${pathname.startsWith("/auth") ? " workspace-nav-link-active" : ""}`}
            href="/auth/sign-in"
          >
            <span className="workspace-nav-link-icon" aria-hidden="true" />
            <span>{authRequired ? "Sign in" : "Account"}</span>
            <small>{authRequired ? "Session required" : "Session active"}</small>
          </Link>
        </div>
      </div>
    </nav>
  );
}
