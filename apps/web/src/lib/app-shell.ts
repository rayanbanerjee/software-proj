export const webAppModules = [
  {
    slug: "editor",
    title: "Editor Core",
    summary: "Document composition, local editing, and the future TipTap-backed editing surface.",
    accent: "Compose"
  },
  {
    slug: "presence",
    title: "Presence Layer",
    summary: "Live collaborator awareness, join state, and reconnect cues built on the collab gateway.",
    accent: "Live"
  },
  {
    slug: "sharing",
    title: "Sharing Controls",
    summary: "Role-aware invite and access management flows for owners, editors, commenters, and viewers.",
    accent: "Access"
  },
  {
    slug: "versions",
    title: "Version History",
    summary: "Revision timelines, rollback checkpoints, and future diff surfaces for document recovery.",
    accent: "History"
  },
  {
    slug: "ai",
    title: "AI Workspace",
    summary: "Prompt-driven writing assistance, proposal review, and future action-specific request flows.",
    accent: "Assist"
  },
  {
    slug: "export",
    title: "Export Pipeline",
    summary: "Queued delivery for text, PDF, and DOCX outputs backed by worker jobs and object storage.",
    accent: "Deliver"
  }
] as const;

export const deliveryTracks = [
  {
    title: "Auth and Identity",
    detail: "Google-based sign-in leads into API-issued sessions and role-aware document access."
  },
  {
    title: "Collaboration Runtime",
    detail: "Fast API metadata routes pair with Hocuspocus/Yjs realtime document state."
  },
  {
    title: "Artifacts and Recovery",
    detail: "Exports, snapshots, and revision checkpoints are treated as first-class runtime outputs."
  }
] as const;
