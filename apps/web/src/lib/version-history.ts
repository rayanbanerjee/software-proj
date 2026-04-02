import type { ListRevisionsResponse, RevisionSummary } from "@repo/shared-types";

import { versionHistory } from "./app-shell";

export type VersionHistoryEntry = {
  key: string;
  label: string;
  summary: string;
  when: string;
};

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
  now: Date
): VersionHistoryEntry {
  return {
    key: revision.revisionId,
    label: revision.label,
    summary: `Revision ${revision.revisionId.slice(0, 9)} captured by ${revision.authorUserId}.`,
    when: formatRelativeTimestamp(revision.createdAt, now)
  };
}

export function getFallbackVersionHistoryEntries(): VersionHistoryEntry[] {
  return versionHistory.map((entry) => ({
    key: entry.label,
    label: entry.label,
    summary: entry.summary,
    when: entry.when
  }));
}

export async function getVersionHistoryEntries(
  documentId: string,
  options: {
    apiBaseUrl?: string;
    cookieHeader?: string | null;
    fetchImpl?: typeof fetch;
    now?: Date;
  } = {}
): Promise<VersionHistoryEntry[]> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return getFallbackVersionHistoryEntries();
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? new Date();

  try {
    const response = await fetchImpl(`${apiBaseUrl}/v1/documents/${documentId}/versions`, {
      cache: "no-store",
      headers: options.cookieHeader
        ? {
            cookie: options.cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return getFallbackVersionHistoryEntries();
    }

    const payload = (await response.json()) as ListRevisionsResponse;

    if (!Array.isArray(payload.revisions) || payload.revisions.length === 0) {
      return getFallbackVersionHistoryEntries();
    }

    return payload.revisions.map((revision) => mapRevisionSummaryToHistoryEntry(revision, now));
  } catch {
    return getFallbackVersionHistoryEntries();
  }
}
