type WorkspaceNavigationItem = {
  href: string;
  label: string;
  summary: string;
  matchPrefix?: string;
};

export const workspaceNavigation: readonly WorkspaceNavigationItem[] = [
  {
    href: "/documents",
    label: "Documents",
    summary: "List shell and launch points into the editor scaffold."
  },
  {
    href: "/ai",
    label: "AI Lab",
    summary: "Prompt templates and retrieval context for AI operations."
  },
  {
    href: "/documents/project-kickoff",
    label: "Editor",
    summary: "Toolbar, presence, history, modal, and state shells.",
    matchPrefix: "/documents/"
  },
  {
    href: "/auth",
    label: "Auth",
    summary: "Signed-out, loading, and signed-in shell previews."
  }
] as const;

export const webAppModules = [
  "documents",
  "auth",
  "sharing",
  "ai",
  "exports"
] as const;

export const workspaceHighlights = [
  {
    title: "Route-first structure",
    detail: "Base layout, auth, list, and editor routes are all in place for the next web slice."
  },
  {
    title: "Shell-safe interactions",
    detail: "Query-driven editor toggles preview overlays, offline state, and empty or error screens."
  },
  {
    title: "Incremental follow-up room",
    detail: "The new document flow remains intentionally blocked until DOCSVC-001 is complete."
  }
] as const;

export const authShellStates = [
  {
    state: "signed-out",
    kicker: "Signed out",
    title: "Prompt the user to start a JWT session",
    description:
      "The login endpoint exists now, so the shell can anchor around a concrete JWT session handoff instead of a generic placeholder.",
    points: [
      "Primary call to action for Google sign-in",
      "Brief explanation of cookie-backed session issuance",
      "Support link for account access issues"
    ]
  },
  {
    state: "loading",
    kicker: "Loading",
    title: "Wait for login and session exchange",
    description:
      "This shell covers the brief state between submitting identity input and receiving the new API-issued session payload.",
    points: [
      "Session exchange progress copy",
      "Temporary protection against double submit",
      "Clear fallback if the callback does not resolve"
    ]
  },
  {
    state: "signed-in",
    kicker: "Signed in",
    title: "Route into the active document workspace",
    description:
      "Once the API session exists, the UI can route the user toward their document list and clearly show which account is active.",
    points: [
      "Active account identity card",
      "Entry point to the document list",
      "Simple sign-out affordance for later auth tasks"
    ]
  }
] as const;

export type DocumentRecord = {
  id: string;
  title: string;
  role: "owner" | "editor" | "commenter";
  updatedLabel: string;
  collaborators: number;
  summary: string;
  paragraphs: readonly string[];
};

type DocumentSection = {
  eyebrow: string;
  title: string;
  summary: string;
  documents: readonly DocumentRecord[];
};

export const documentListSections: readonly DocumentSection[] = [
  {
    eyebrow: "Recent",
    title: "Recently touched",
    summary: "Open any item to preview the editor route shell and its workspace controls.",
    documents: [
      {
        id: "project-kickoff",
        title: "Project kickoff",
        role: "owner",
        updatedLabel: "Updated 12 minutes ago",
        collaborators: 4,
        summary: "Planning outline for the collaborative editor rollout.",
        paragraphs: [
          "The kickoff document anchors the sprint goals, the initial product walkthrough, and the ownership split for editor, API, and collab work.",
          "A later editor task will replace this shell text with a real rich-text surface and block-level selection behavior."
        ]
      },
      {
        id: "design-review-notes",
        title: "Design review notes",
        role: "editor",
        updatedLabel: "Updated yesterday",
        collaborators: 3,
        summary: "UI checkpoints for review flow, side panels, and shell interactions.",
        paragraphs: [
          "Review notes currently focus on navigation clarity, panel hierarchy, and route-level state treatment across mobile and desktop layouts.",
          "Follow-up tasks will connect these view shells to real data hooks and a real editor model."
        ]
      }
    ]
  },
  {
    eyebrow: "Shared",
    title: "Shared with me",
    summary: "Placeholder visibility and role labels make the list scaffold useful before live membership data exists.",
    documents: [
      {
        id: "retrospective-archive",
        title: "Retrospective archive",
        role: "commenter",
        updatedLabel: "Updated 3 days ago",
        collaborators: 6,
        summary: "Archived feedback patterns for UX polish and workflow timing.",
        paragraphs: [
          "The retrospective archive is shown here as a role-limited document shell for comment-oriented review and timeline context.",
          "Future sharing and permission tasks will replace these static summaries with real API-backed visibility."
        ]
      }
    ]
  }
] as const;

export type DocumentScreenState = "ready" | "empty" | "error";
export type DocumentOverlay = "sharing" | "ai" | "export" | null;

export const collaboratorPresence = [
  {
    initials: "IA",
    name: "Islam Aldaraghmeh",
    status: "Editing the heading block"
  },
  {
    initials: "RB",
    name: "Rayan Banerjee",
    status: "Reviewing panel layout"
  },
  {
    initials: "PP",
    name: "Picky Potato",
    status: "Watching in read-only mode"
  }
] as const;

export const versionHistory = [
  {
    label: "Checkpoint A12",
    summary: "Captured after the product scope review.",
    when: "9 minutes ago"
  },
  {
    label: "Checkpoint A11",
    summary: "Saved after comments from the design critique.",
    when: "Yesterday"
  },
  {
    label: "Checkpoint A10",
    summary: "Baseline before editor shell expansion.",
    when: "3 days ago"
  }
] as const;

export const sharingRoles = [
  {
    role: "Viewer",
    description: "Can browse the document and follow collaborator activity."
  },
  {
    role: "Commenter",
    description: "Can add feedback threads and participate in review cycles."
  },
  {
    role: "Editor",
    description: "Can make document changes and collaborate on active drafting."
  }
] as const;

export const aiActionMenu = [
  {
    title: "Rewrite section",
    summary: "Launches a future prompt flow for tone and structure adjustments."
  },
  {
    title: "Summarize selection",
    summary: "Reserves space for quick summaries of highlighted content."
  },
  {
    title: "Restructure outline",
    summary: "Previews a future AI suggestion pass over headings and flow."
  }
] as const;

export const exportOptions = [
  {
    format: "Plain text",
    summary: "Worker-backed text exports will queue here when export jobs land."
  },
  {
    format: "PDF",
    summary: "Portable sharing output with later formatting and page rules."
  },
  {
    format: "DOCX",
    summary: "Editable handoff format for downstream document workflows."
  }
] as const;

export const activeOverlayCopy = {
  sharing: "permission and invite preview",
  ai: "AI action menu preview",
  export: "export options preview"
} as const satisfies Record<Exclude<DocumentOverlay, null>, string>;

export function getDocumentRecord(documentId: string): DocumentRecord {
  const documents = documentListSections.flatMap((section) => section.documents);
  const existingDocument = documents.find((document) => document.id === documentId);

  if (existingDocument) {
    return existingDocument;
  }

  return {
    id: documentId,
    title: documentId
      .split("-")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" "),
    role: "owner",
    updatedLabel: "Updated just now",
    collaborators: 3,
    summary: "Fallback shell document generated from the route segment.",
    paragraphs: [
      "This fallback route shell keeps the editor view stable even when the URL does not match a seeded document card.",
      "Later data fetching tasks will replace this logic with document metadata from the API."
    ]
  };
}

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDocumentScreenState(
  value: string | string[] | undefined
): DocumentScreenState {
  const normalized = getStringValue(value);

  if (normalized === "empty" || normalized === "error") {
    return normalized;
  }

  return "ready";
}

export function parseDocumentOverlay(value: string | string[] | undefined): DocumentOverlay {
  const normalized = getStringValue(value);

  if (normalized === "sharing" || normalized === "ai" || normalized === "export") {
    return normalized;
  }

  return null;
}

export function parseOfflineFlag(value: string | string[] | undefined): boolean {
  return getStringValue(value) === "1";
}
