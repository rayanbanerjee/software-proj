# TASK-0026 Rollback Events And Version History Hook

## Summary

Complete the next versioning integration slice by broadcasting rollback events through the collab service and replacing the editor shell's hardcoded history panel with a real revision-list data hook plus fallback behavior.

## Scope

- rebroadcast a stateless rollback event from the collab service
- notify the collab service after API rollback completion
- load version history entries for the web editor route from the versions API when available
- preserve shell-safe fallback history when the API is unavailable or unauthorized
- add focused API, collab, and web tests

## Out Of Scope

- applying rollback content directly into active Yjs state
- diff rendering in the web UI
- persistent revision storage or optimistic concurrency guards

## Notes

- the rollback notification path should not fail the API rollback request if the collab service is temporarily unavailable
- the web history hook should stay usable for the shell experience even when no authenticated API request succeeds

## Completion

- `VER-006` completed in `apps/collab` and `apps/api`
- `VER-007` completed in `apps/web`
