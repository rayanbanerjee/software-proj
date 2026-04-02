# 2026-04-02 OpenRouter Provider Integration

## Summary

Added an OpenRouter-backed AI provider path to the API while preserving the local mock provider as the default fallback for development and tests.

## What changed

- introduced a provider interface for AI generation in `apps/api/src/modules/ai`
- added an `OpenRouterProviderClient` that calls OpenRouter's chat completions endpoint and requests JSON output
- switched AI module bootstrap to use OpenRouter when `OPENROUTER_API_KEY` is configured
- added explicit OpenRouter env variables to API and root example env files
- updated AI docs to describe provider selection and OpenRouter-specific headers

## Follow-up

- add a real provider-backed integration test once a safe secret injection path exists for CI
- consider moving AI request execution into the worker service once persistence is added
