# TASK-0032 OpenRouter Provider Integration

## Goal

Add a real AI provider path for document proposals using OpenRouter without breaking the existing local development and test workflow.

## Scope

- add OpenRouter env configuration to the API
- introduce a provider interface so the AI module can switch between OpenRouter and the existing mock provider
- keep the current AI request/proposal/status routes stable
- document the new provider configuration and fallback behavior

## Non-goals

- provider-specific streaming support
- persistence for AI requests
- multi-provider routing beyond OpenRouter and mock fallback

## Dependencies

- existing AI lifecycle implementation in `apps/api/src/modules/ai`

## Implementation notes

- use OpenRouter's OpenAI-compatible chat completions endpoint
- request JSON output so the existing proposal DTO can be populated without changing the API contract
- preserve the mock provider as the default when no key is configured
- store provider failures as failed AI requests instead of crashing the route

## Status

Completed on 2026-04-02.

## Links

- [AI API](/Users/rayan.banerjee/courses/software%20project/docs/api/ai.md)
- [OpenRouter provider](/Users/rayan.banerjee/courses/software%20project/apps/api/src/modules/ai/openrouter-provider.ts)
