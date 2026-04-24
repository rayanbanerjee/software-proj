import type {
  ListRevisionsResponse,
  RevisionDiffResponse,
  RevisionSummary
} from "@repo/shared-types";

export type VersionHistoryEntry = {
  authorLabel: string;
  changeDescription: string;
  changeDetails: string[];
  key: string;
  label: string;
  summary: string;
  when: string;
};

function formatActorLabel(value: string | null) {
  if (!value) {
    return "Unknown author";
  }

  if (value.startsWith("jwt:")) {
    return "You";
  }

  if (value.includes("@")) {
    return value.split("@")[0] ?? value;
  }

  return value;
}

function formatRelativeTimestamp(isoDate: string, now: Date) {
  const timestamp = Date.parse(isoDate);

  if (Number.isNaN(timestamp)) {
    return "Updated recently";
  }

  const diffMs = Math.max(0, now.getTime() - timestamp);
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function mapRevisionSummaryToHistoryEntry(
  revision: RevisionSummary,
  now: Date,
  diff?: RevisionDiffResponse | null
): VersionHistoryEntry {
  const authorLabel = formatActorLabel(revision.authorUserId);
  const changeDetails = diff?.changes.map((change) => change.description).slice(0, 4) ?? [];
  const changeDescription = changeDetails[0]
    ?? `Revision ${revision.revisionId.slice(0, 9)} captured by ${authorLabel}.`;

  return {
    authorLabel,
    changeDescription,
    changeDetails,
    key: revision.revisionId,
    label: revision.label,
    summary: `Changed by ${authorLabel}. ${changeDescription}`,
    when: formatRelativeTimestamp(revision.createdAt, now)
  };
}

export async function getVersionHistoryEntries(
  documentId: string,
  options: {
    apiBaseUrl?: string;
    cookieHeader?: string | null;
    credentials?: RequestCredentials;
    fetchImpl?: typeof fetch;
    now?: Date;
  } = {}
): Promise<VersionHistoryEntry[]> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? new Date();

  try {
    const response = await fetchImpl(`${apiBaseUrl}/v1/documents/${documentId}/versions`, {
      cache: "no-store",
      credentials: options.credentials ?? "include",
      headers: options.cookieHeader
        ? {
            cookie: options.cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as ListRevisionsResponse;

    if (!Array.isArray(payload.revisions) || payload.revisions.length === 0) {
      return [];
    }

    const diffs = await Promise.all(
      payload.revisions.map(async (revision, index) => {
        const compareToRevisionId = payload.revisions[index + 1]?.revisionId;
        const diffUrl = new URL(`${apiBaseUrl}/v1/documents/${documentId}/versions/${revision.revisionId}/diff`);

        if (compareToRevisionId) {
          diffUrl.searchParams.set("compareToRevisionId", compareToRevisionId);
        }

        try {
          const diffResponse = await fetchImpl(diffUrl.toString(), {
            cache: "no-store",
            credentials: options.credentials ?? "include",
            headers: options.cookieHeader
              ? {
                  cookie: options.cookieHeader
                }
              : undefined
          });

          if (!diffResponse.ok) {
            return null;
          }

          return (await diffResponse.json()) as RevisionDiffResponse;
        } catch {
          return null;
        }
      })
    );

    return payload.revisions.map((revision, index) =>
      mapRevisionSummaryToHistoryEntry(revision, now, diffs[index])
    );
  } catch {
    return [];
  }
}
