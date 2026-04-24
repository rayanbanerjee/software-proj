import type {
  GetRevisionDetailResponse,
  RevisionDetail,
  RevisionDiffResponse,
  RollbackRevisionResponse
} from "@repo/shared-types";

export async function getRevisionDetail(
  documentId: string,
  revisionId: string,
  options: {
    apiBaseUrl?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<RevisionDetail> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const fetchImpl = options.fetchImpl ?? fetch;

  const response = await fetchImpl(`${apiBaseUrl}/v1/documents/${documentId}/versions/${revisionId}`, {
    credentials: "include"
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error?.message ?? "Failed to load revision detail.");
  }

  const payload = await response.json() as GetRevisionDetailResponse;
  return payload.revision;
}

export async function getRevisionDiff(
  documentId: string,
  revisionId: string,
  compareToRevisionId: string | null,
  options: {
    apiBaseUrl?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<RevisionDiffResponse> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(`${apiBaseUrl}/v1/documents/${documentId}/versions/${revisionId}/diff`);

  if (compareToRevisionId) {
    url.searchParams.set("compareToRevisionId", compareToRevisionId);
  }

  const response = await fetchImpl(url.toString(), {
    credentials: "include"
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error?.message ?? "Failed to load revision diff.");
  }

  return await response.json() as RevisionDiffResponse;
}

export async function rollbackRevision(
  documentId: string,
  revisionId: string,
  options: {
    apiBaseUrl?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<RollbackRevisionResponse> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const fetchImpl = options.fetchImpl ?? fetch;

  const response = await fetchImpl(`${apiBaseUrl}/v1/documents/${documentId}/versions/rollback`, {
    body: JSON.stringify({
      revisionId
    }),
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error?.message ?? "Failed to revert to this revision.");
  }

  return await response.json() as RollbackRevisionResponse;
}
