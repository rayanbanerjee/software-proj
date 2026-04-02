# 2026-04-02 - Worker foundation

## Summary
Added the initial worker foundation in `apps/worker` for background AI, export, and revision-summary job processing.

## Changes
- added worker runtime bootstrap
- added queue connection config based on worker environment variables
- added centralized queue names
- added centralized retry and backoff defaults
- added stub processors for AI jobs, export jobs, and revision summary jobs
- added worker unit tests for:
  - environment parsing
  - retry/backoff defaults
  - processor stubs
  - runtime queue registration

## Follow-up
- connect AI processor to real AI request persistence and status updates
- connect export processor to export job lifecycle and storage artifacts
- connect revision summary processor to revision/version flows
- add integration coverage against real infrastructure later