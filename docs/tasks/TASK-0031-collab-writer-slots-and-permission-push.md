# TASK-0031 Collab Writer Slots And Permission Push

## Summary

Finish the remaining collaboration runtime work by adding deterministic writer-slot allocation, queue promotion, and permission-update propagation from the API into the collab service.

## Scope

- add a writer-slot manager for active and queued write-capable sessions
- broadcast stateless writer-slot snapshots from the collab server
- add an internal collab endpoint for `document.permission.updated`
- post permission updates from sharing routes after invitation acceptance, role changes, and revocation
- update collaboration docs for writer slots and permission events

## Out Of Scope

- forcibly closing live websocket connections
- state-vector merge on reconnect
- permission downgrade handling inside the editor client beyond receiving the stateless event

## Completion

- completed `COLLAB-006`
- completed `COLLAB-007`
- completed `COLLAB-008`
