"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function WorkspaceActivityRail() {
  const pathname = usePathname();
  const router = useRouter();
  const onDocumentPage = pathname.startsWith("/documents/");

  function jumpToSection(sectionId: "changes" | "comments" | "participants") {
    if (!onDocumentPage) {
      router.push("/documents");
      return;
    }

    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  return (
    <nav className="workspace-activity-rail" aria-label="Workspace sections">
      <Link
        aria-label="Open documents"
        className="workspace-activity-logo workspace-activity-link"
        href="/documents"
      >
        <span className="workspace-activity-logo-lines" />
      </Link>

      <div className="workspace-activity-icons">
        <Link
          aria-label="Documents"
          className={`workspace-activity-icon workspace-activity-icon-doc workspace-activity-link${pathname === "/documents" ? " workspace-activity-icon-active" : ""}`}
          href="/documents"
        />
        <button
          aria-disabled={!onDocumentPage}
          aria-label="Jump to participants"
          className={`workspace-activity-icon workspace-activity-icon-users workspace-activity-link${onDocumentPage ? "" : " workspace-activity-link-disabled"}`}
          onClick={() => jumpToSection("participants")}
          type="button"
        />
        <button
          aria-disabled={!onDocumentPage}
          aria-label="Jump to comments"
          className={`workspace-activity-icon workspace-activity-icon-spark workspace-activity-link${onDocumentPage ? "" : " workspace-activity-link-disabled"}`}
          onClick={() => jumpToSection("comments")}
          type="button"
        />
        <button
          aria-disabled={!onDocumentPage}
          aria-label="Jump to history"
          className={`workspace-activity-icon workspace-activity-icon-history workspace-activity-link${onDocumentPage ? "" : " workspace-activity-link-disabled"}`}
          onClick={() => jumpToSection("changes")}
          type="button"
        />
      </div>
    </nav>
  );
}
