import { promptTemplates } from "@repo/prompt-templates";
import type {
  DocumentContent,
  DocumentSummary,
  ListPromptTemplatesResponse,
  PromptTemplateSummary,
  RagContextChunk,
  RetrieveRagContextResponse
} from "@repo/shared-types";
import type { AuditEventRecord, UserProfile } from "@repo/shared-types";

function titleForAction(action: PromptTemplateSummary["action"]) {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function listPromptTemplates(): ListPromptTemplatesResponse {
  return {
    templates: Object.values(promptTemplates).map((template) => ({
      action: template.action,
      title: `${titleForAction(template.action)} template`,
      systemPrompt: template.systemPrompt,
      version: template.version
    }))
  };
}

export function retrieveRagContext(input: {
  auditEvents: AuditEventRecord[];
  documentContents: DocumentContent[];
  documents: DocumentSummary[];
  query: string;
  topK?: number;
  user: UserProfile;
}): RetrieveRagContextResponse {
  const normalizedQuery = input.query.trim();
  const topK = clampTopK(input.topK ?? 5);
  const queryTokens = tokenize(normalizedQuery);
  const candidates: RagContextChunk[] = [];

  for (const document of input.documents) {
    pushChunk(candidates, queryTokens, {
      id: `document-title:${document.id}`,
      sourceType: "document_title",
      sourceLabel: `${document.title} title`,
      documentId: document.id,
      text: document.title,
      rationale: "Document titles are the lightest-weight retrieval signal available in this branch."
    });

    pushChunk(candidates, queryTokens, {
      id: `document-role:${document.id}`,
      sourceType: "document_role",
      sourceLabel: `${document.title} access summary`,
      documentId: document.id,
      text: `${input.user.name ?? input.user.email} has ${document.role} access on ${document.title}.`,
      rationale: "Role context helps prompt assembly choose whether the request can read, edit, or share."
    });
  }

  for (const content of input.documentContents) {
    for (const chunk of splitDocumentContent(content)) {
      pushChunk(candidates, queryTokens, chunk);
    }
  }

  for (const event of input.auditEvents) {
    pushChunk(candidates, queryTokens, {
      id: `audit:${event.id}`,
      sourceType: "audit_event",
      sourceLabel: event.action,
      documentId: event.documentId,
      text: buildAuditText(event),
      rationale: "Recent document activity gives the model situational context when prompt text is sparse."
    });
  }

  for (const template of Object.values(promptTemplates)) {
    pushChunk(candidates, queryTokens, {
      id: `template:${template.action}`,
      sourceType: "prompt_template",
      sourceLabel: `${titleForAction(template.action)} template`,
      documentId: null,
      text: template.systemPrompt,
      rationale: "Template prompts are included so the user can inspect the base instruction that retrieval would pair with the request."
    });
  }

  const chunks = candidates
    .filter((chunk) => chunk.score > 0 || normalizedQuery.length === 0)
    .sort((left, right) => right.score - left.score || left.sourceLabel.localeCompare(right.sourceLabel))
    .slice(0, topK);

  return {
    query: normalizedQuery,
    chunks
  };
}

function buildAuditText(event: AuditEventRecord) {
  const metadata = Object.entries(event.metadata)
    .map(([key, value]) => `${key}=${value ?? "null"}`)
    .join(", ");

  return [event.action, event.documentId ? `document=${event.documentId}` : null, metadata || null]
    .filter((part): part is string => Boolean(part))
    .join(" | ");
}

function splitDocumentContent(content: DocumentContent): Omit<RagContextChunk, "score">[] {
  const paragraphs = content.text
    .split(/\n{2,}/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [];
  }

  return paragraphs.slice(0, 12).map((paragraph, index) => ({
    id: `document-content:${content.documentId}:${index}`,
    sourceType: "document_content",
    sourceLabel: `Document content chunk ${index + 1}`,
    documentId: content.documentId,
    text: paragraph,
    rationale: "Document body chunks are the primary retrieval corpus for prompt assembly on this branch."
  }));
}

function pushChunk(target: RagContextChunk[], queryTokens: string[], base: Omit<RagContextChunk, "score">) {
  target.push({
    ...base,
    score: scoreText(queryTokens, base.text, base.sourceLabel)
  });
}

function scoreText(queryTokens: string[], ...fields: string[]) {
  if (queryTokens.length === 0) {
    return 0;
  }

  const haystack = tokenize(fields.join(" "));
  let score = 0;

  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function clampTopK(value: number) {
  return Math.max(1, Math.min(10, Math.trunc(value)));
}
