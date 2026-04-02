"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { workspaceNavigation } from "../../lib/app-shell";

export function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav className="workspace-nav" aria-label="Workspace navigation">
      {workspaceNavigation.map((item) => {
        const isActive = item.matchPrefix
          ? pathname.startsWith(item.matchPrefix)
          : pathname === item.href;

        return (
          <Link
            className={`workspace-nav-link${isActive ? " workspace-nav-link-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            <span>{item.label}</span>
            <small>{item.summary}</small>
          </Link>
        );
      })}
    </nav>
  );
}
