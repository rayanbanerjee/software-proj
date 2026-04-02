# Service Health And Readiness

## `GET /health`

Returns a lightweight liveness response for each service.

### API

```json
{
  "service": "api",
  "status": "ok"
}
```

### Collaboration

```json
{
  "service": "collab",
  "status": "ok"
}
```

### Worker

```json
{
  "service": "worker",
  "status": "ok"
}
```

## `GET /ready`

Returns readiness information for each service.

### API

```json
{
  "service": "api",
  "status": "ready"
}
```

### Collaboration

```json
{
  "service": "collab",
  "status": "ready",
  "activeDocuments": 0,
  "activeConnections": 0
}
```

### Worker

```json
{
  "service": "worker",
  "status": "ready",
  "workerCount": 3,
  "queues": ["ai-jobs", "export-jobs", "revision-jobs"]
}
```

## Notes

- the collaboration server exposes its health and readiness routes through the Hocuspocus HTTP handler alongside the WebSocket endpoint
- the worker uses a lightweight HTTP server on its configured port for health and readiness responses
