# TASK-0028 AI Staleness And Export UI

## Summary

Finish the next realistic AI and export batch by wiring proposal staleness into the API lifecycle, adding fixture-backed AI integration coverage, and making the export modal reflect real export-job status when a job id is available.

## Scope

- add a reusable AI staleness helper based on revision fingerprint and source-text hash
- wire stale proposal checks into AI status and accept flows
- add fixture-backed AI integration coverage for stale request behavior
- add a web export panel state loader that reads export job status and download links from the API
- wire the export overlay to use the fetched panel state

## Out Of Scope

- triggering real export jobs from the web shell
- persistent revision tracking for stale AI checks
- applying accepted AI proposals into the document

## Completion

- completed `AI-007`
- completed `AI-013`
- completed `EXP-007`
