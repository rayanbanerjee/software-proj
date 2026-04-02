# Spec: Audit Event Schema

## Status

Draft

## Goal

Define the minimum stable shape for audit events emitted by API-side document and sharing actions.

## Event shape

- `id`: unique event identifier
- `action`: stable action name such as `document.share.updated`
- `actorUserId`: user that triggered the event
- `documentId`: related document id or `null`
- `targetUserId`: affected downstream user id or `null`
- `occurredAt`: ISO timestamp
- `metadata`: string or null values only

## Validation rules

- `action` and `actorUserId` must be non-empty strings
- `documentId` and `targetUserId` may be omitted but normalize to `null`
- `metadata` values must stay lightweight and string-serializable

## Notes

- current storage remains in memory
- the schema is intentionally narrow so later persistence can be added without changing event shape
