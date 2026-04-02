import { createHash } from "node:crypto";

export interface ProposalRevisionFingerprint {
  revisionKey: string;
  textHash: string;
}

export function buildProposalRevisionFingerprint(input: {
  documentId: string;
  scope: "document" | "selection";
  sourceText: string;
}): ProposalRevisionFingerprint {
  return {
    revisionKey: `${input.documentId}:${input.scope}`,
    textHash: createHash("sha256").update(input.sourceText).digest("hex")
  };
}

export function isProposalStale(
  source: ProposalRevisionFingerprint,
  current: ProposalRevisionFingerprint
): boolean {
  return source.revisionKey !== current.revisionKey || source.textHash !== current.textHash;
}
