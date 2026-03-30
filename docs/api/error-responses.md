# Error Responses

## Standard Shape

All application-managed API errors should return:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message.",
    "statusCode": 400
  }
}
```

## Current Cases

- `NOT_FOUND`: route does not exist
- `BAD_REQUEST`: explicit application validation or request errors
- `INTERNAL_SERVER_ERROR`: unhandled server-side failures

## Notes

- this shape is now the baseline contract for future API modules
- more domain-specific error codes can be added without changing the envelope

