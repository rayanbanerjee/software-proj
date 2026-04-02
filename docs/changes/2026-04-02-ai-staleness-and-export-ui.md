# 2026-04-02 AI Staleness And Export UI

## Summary

Added fingerprint-based AI proposal staleness checks, covered the flow with shared fixtures in integration tests, and upgraded the export modal so it can display a real export job state and download link when a selected job is present.

## What Changed

- added a reusable AI staleness helper based on revision keys and source-text hashing
- wired stale proposal detection into AI status polling and proposal acceptance
- added fixture-backed AI integration coverage for a request that becomes stale before acceptance
- added a web export panel state loader that fetches export status and download links from the API
- wired the document route and export modal shell to consume the new export panel state

## Follow-Up

- connect staleness checks to durable revision tracking instead of the current in-memory fingerprint state
- add a web trigger path that actually requests export jobs from the editor overlay
