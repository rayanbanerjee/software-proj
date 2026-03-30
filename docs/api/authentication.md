# Authentication Config

## Required API Environment Variables

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`

## Notes

- these values are required by the API config loader before auth endpoints are implemented
- backend validation of Google-issued tokens will depend on `GOOGLE_CLIENT_ID`
- session signing or token issuance will depend on `SESSION_SECRET`
