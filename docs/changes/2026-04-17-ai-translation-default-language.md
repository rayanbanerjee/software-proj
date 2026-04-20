# Change: AI Translation Default Language

## Date

2026-04-17

## Summary

Made the AI translation action deterministic by defaulting it to English when no target language is provided, and aligned the web labels and mock providers with that behavior.

## Affected Areas

- `apps/api/src/modules/ai/openrouter-provider.ts`
- `apps/api/src/modules/ai/mock-provider-client.ts`
- `apps/api/tests/ai.test.ts`
- `apps/web/src/components/documents/document-workspace-shell.tsx`
- `apps/web/src/components/documents/document-utility-panel.tsx`
- `apps/web/src/editor/base-editor.tsx`
- `apps/worker/src/ai/mock-provider.ts`
- `apps/worker/tests/mock-ai.test.ts`
- `packages/prompt-templates/src/index.ts`

## Key Decisions

- treat `translate` as `translate to English` unless a later UI or API request names a different target language
- keep the first fix low-friction by reusing the existing `prompt` field instead of introducing a new translation form contract
- align mock and provider wording so local development matches the user-facing labels

## Follow-Up

- add a real target language picker in the web UI once the team is ready for a richer AI workflow
- extend the API request contract if translation needs stronger typed language configuration later
