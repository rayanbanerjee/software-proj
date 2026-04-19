import type { FastifyInstance } from "fastify";

import type { DocumentActor } from "./service.js";

function getCollabContentSyncUrl(collabUrl: string, documentId: string) {
  const url = new URL(collabUrl);

  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = `/internal/documents/${documentId}/content-sync`;
  url.search = "";

  return url.toString();
}

export async function notifyCollabDocumentContentSync(
  app: FastifyInstance,
  documentId: string,
  actor: DocumentActor,
  options: {
    initializeIfEmpty?: boolean;
  } = {}
) {
  const endpoint = getCollabContentSyncUrl(app.apiEnv.COLLAB_URL, documentId);
  const snapshot = app.documentsService.getDocumentSnapshot(documentId, actor);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-collab-token": app.apiEnv.SESSION_SECRET
      },
      body: JSON.stringify({
        initializeIfEmpty: options.initializeIfEmpty ?? false,
        text: snapshot.text
      })
    });

    if (!response.ok) {
      app.appLogger.warn("documents.collab_content_sync_failed", {
        documentId,
        endpoint,
        initializeIfEmpty: options.initializeIfEmpty ?? false,
        statusCode: response.status
      });
    }
  } catch (error) {
    app.appLogger.warn("documents.collab_content_sync_failed", {
      documentId,
      endpoint,
      error: error instanceof Error ? error.message : "Unknown fetch failure.",
      initializeIfEmpty: options.initializeIfEmpty ?? false
    });
  }
}
