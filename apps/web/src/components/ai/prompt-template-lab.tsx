"use client";

import type {
  DocumentSummary,
  GetDocumentContentResponse,
  ListPromptTemplatesResponse,
  RagContextChunk,
  ListDocumentsResponse,
  RetrieveRagContextResponse
} from "@repo/shared-types";
import { useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export function PromptTemplateLab() {
  const [templates, setTemplates] = useState<ListPromptTemplatesResponse["templates"]>([]);
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [chunks, setChunks] = useState<RagContextChunk[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrieveError, setRetrieveError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);

  useEffect(() => {
    async function loadTemplates() {
      try {
        setIsLoadingTemplates(true);
        setLoadError(null);

        const response = await fetch(`${apiBaseUrl}/v1/ai/prompt-templates`, {
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error("Failed to load prompt templates.");
        }

        const payload = (await response.json()) as ListPromptTemplatesResponse;
        setTemplates(payload.templates);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load prompt templates.");
      } finally {
        setIsLoadingTemplates(false);
      }
    }

    void loadTemplates();
  }, []);

  useEffect(() => {
    async function loadDocuments() {
      try {
        setIsLoadingDocuments(true);
        setContentError(null);

        const response = await fetch(`${apiBaseUrl}/v1/documents`, {
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error("Failed to load documents.");
        }

        const payload = (await response.json()) as ListDocumentsResponse;
        setDocuments(payload.documents);

        if (payload.documents[0]) {
          setSelectedDocumentId((current) => current || payload.documents[0]!.id);
        }
      } catch (error) {
        setContentError(error instanceof Error ? error.message : "Failed to load documents.");
      } finally {
        setIsLoadingDocuments(false);
      }
    }

    void loadDocuments();
  }, []);

  useEffect(() => {
    if (!selectedDocumentId) {
      setDocumentText("");
      return;
    }

    async function loadDocumentContent() {
      try {
        setContentError(null);

        const response = await fetch(`${apiBaseUrl}/v1/documents/${selectedDocumentId}/content`, {
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error("Failed to load document content.");
        }

        const payload = (await response.json()) as GetDocumentContentResponse;
        setDocumentText(payload.content.text);
      } catch (error) {
        setContentError(error instanceof Error ? error.message : "Failed to load document content.");
      }
    }

    void loadDocumentContent();
  }, [selectedDocumentId]);

  function runRetrieval() {
    async function retrieve() {
      try {
        setIsRetrieving(true);
        setRetrieveError(null);

        const response = await fetch(`${apiBaseUrl}/v1/ai/context/retrieve`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query,
            topK
          })
        });

        if (!response.ok) {
          throw new Error("Failed to retrieve context.");
        }

        const payload = (await response.json()) as RetrieveRagContextResponse;
        setChunks(payload.chunks);
      } catch (error) {
        setRetrieveError(error instanceof Error ? error.message : "Failed to retrieve context.");
      } finally {
        setIsRetrieving(false);
      }
    }

    void retrieve();
  }

  function saveDocumentContent() {
    if (!selectedDocumentId) {
      return;
    }

    async function save() {
      try {
        setIsSavingContent(true);
        setContentError(null);

        const response = await fetch(`${apiBaseUrl}/v1/documents/${selectedDocumentId}/content`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: documentText
          })
        });

        if (!response.ok) {
          throw new Error("Failed to save document content.");
        }
      } catch (error) {
        setContentError(error instanceof Error ? error.message : "Failed to save document content.");
      } finally {
        setIsSavingContent(false);
      }
    }

    void save();
  }

  return (
    <div className="prompt-lab-shell">
      <section className="page-intro-card">
        <span className="workspace-kicker">AI-101</span>
        <h2>Prompt templates and retrieval lab</h2>
        <p>
          Inspect the system prompts behind each AI action and run ranked context retrieval over
          the authenticated workspace state available on this branch.
        </p>
      </section>

      <div className="prompt-lab-grid">
        <section className="prompt-lab-panel">
          <div className="prompt-lab-panel-header">
            <span className="section-chip">Templates</span>
            <h3>Prompt templates</h3>
          </div>
          <p className="prompt-lab-copy">
            Templates are shared from the workspace package and represent the base system
            instruction for each AI action.
          </p>

          {loadError ? <p className="prompt-lab-error">{loadError}</p> : null}
          {isLoadingTemplates && templates.length === 0 ? (
            <p className="prompt-lab-copy">Loading prompt templates…</p>
          ) : null}

          <div className="prompt-template-list">
            {templates.map((template) => (
              <article className="prompt-template-card" key={template.action}>
                <div className="prompt-template-header">
                  <strong>{template.title}</strong>
                  <span>Version {template.version}</span>
                </div>
                <p>{template.systemPrompt}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="prompt-lab-panel">
          <div className="prompt-lab-panel-header">
            <span className="section-chip">Corpus</span>
            <h3>Document content corpus</h3>
          </div>
          <p className="prompt-lab-copy">
            Retrieval now chunks over stored document bodies. Pick a document, edit its text, and
            save it to the API-backed corpus used by the RAG endpoint.
          </p>

          <div className="rag-query-form">
            <label className="auth-login-field">
              <span>Document</span>
              <select
                disabled={isLoadingDocuments || documents.length === 0}
                onChange={(event) => setSelectedDocumentId(event.target.value)}
                value={selectedDocumentId}
              >
                {documents.length === 0 ? <option value="">No documents available</option> : null}
                {documents.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth-login-field">
              <span>Document content</span>
              <textarea
                onChange={(event) => setDocumentText(event.target.value)}
                placeholder="Paste or draft the document content that retrieval should index."
                rows={10}
                value={documentText}
              />
            </label>

            <div className="auth-login-actions">
              <button
                disabled={!selectedDocumentId || isSavingContent || isLoadingDocuments}
                onClick={saveDocumentContent}
                type="button"
              >
                {isSavingContent ? "Saving…" : "Save corpus text"}
              </button>
            </div>
          </div>

          {contentError ? <p className="prompt-lab-error">{contentError}</p> : null}
          {isLoadingDocuments ? <p className="prompt-lab-copy">Loading documents…</p> : null}
        </section>

        <section className="prompt-lab-panel">
          <div className="prompt-lab-panel-header">
            <span className="section-chip">RAG</span>
            <h3>Intelligent context retrieval</h3>
          </div>
          <p className="prompt-lab-copy">
            Retrieval ranks the best available workspace signals on this branch: stored document
            body chunks, document titles, role summaries, recent audit events, and the prompt
            templates themselves.
          </p>

          <div className="rag-query-form">
            <label className="auth-login-field">
              <span>Query</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="release summary, invite flow, editor access..."
                type="text"
                value={query}
              />
            </label>

            <label className="auth-login-field">
              <span>Top K</span>
              <input
                max={10}
                min={1}
                onChange={(event) => setTopK(Number(event.target.value) || 5)}
                type="number"
                value={topK}
              />
            </label>

            <div className="auth-login-actions">
              <button disabled={isRetrieving} onClick={runRetrieval} type="button">
                {isRetrieving ? "Retrieving…" : "Retrieve context"}
              </button>
            </div>
          </div>

          {retrieveError ? <p className="prompt-lab-error">{retrieveError}</p> : null}

          <div className="rag-result-list">
            {chunks.length === 0 ? (
              <article className="rag-result-card">
                <strong>No retrieval results yet</strong>
                <p>Run a query to inspect the context chunks that would be assembled for an AI request.</p>
              </article>
            ) : (
              chunks.map((chunk) => (
                <article className="rag-result-card" key={chunk.id}>
                  <div className="rag-result-topline">
                    <strong>{chunk.sourceLabel}</strong>
                    <span>{chunk.sourceType}</span>
                  </div>
                  <p>{chunk.text}</p>
                  <dl className="rag-result-meta">
                    <div>
                      <dt>Score</dt>
                      <dd>{chunk.score}</dd>
                    </div>
                    <div>
                      <dt>Document</dt>
                      <dd>{chunk.documentId ?? "global"}</dd>
                    </div>
                  </dl>
                  <small>{chunk.rationale}</small>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
