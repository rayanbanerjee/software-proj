# Export Pipeline Specification

## Overview

The export pipeline enables users to request document exports in multiple formats (txt, pdf, docx), track export status, and retrieve a downloadable artifact through a secure URL.

This pipeline follows an asynchronous job model aligned with the system architecture, where export requests are handled via API endpoints and processed by a background worker.

---

## High-Level Flow

1. User requests export via API  
2. API creates an export job and returns a job ID  
3. The process-local export worker processes the export job asynchronously  
4. User polls export status endpoint  
5. When ready, user retrieves a secure download URL  

---

## API Endpoints

### 1. Create Export Job

**POST /documents/{id}/exports**

#### Request body

```json
{
  "format": "txt" | "pdf" | "docx"
}
```

#### Response

```json
{
  "exportJobId": "exp_...",
  "status": "queued"
}
```

---

### 2. Get Export Status

**GET /documents/{id}/exports/{exportId}**

#### Response

```json
{
  "job": {
    "exportJobId": "exp_...",
    "documentId": "doc1",
    "format": "pdf",
    "status": "queued" | "running" | "succeeded" | "failed",
    "requestedAt": "2026-04-19T10:00:00.000Z",
    "completedAt": "2026-04-19T10:00:02.000Z",
    "downloadUrl": null
  }
}
```

---

### 3. Get Download URL

**GET /documents/{id}/exports/{exportId}/download**

#### Response

```json
{
  "downloadUrl": "/documents/doc1/exports/exp_.../artifact?token=...",
  "expiresAt": "2026-04-02T10:19:33.097Z"
}
```

---

## Worker Responsibilities

The background worker is responsible for processing export jobs.

### Job Types

- `export-jobs`

### Responsibilities

- receive export job payload  
- select appropriate renderer based on format  
- generate and persist the export artifact  
- update job status  

---

## Renderers

The system supports multiple export formats via dedicated renderers:

### Plain Text Renderer

- converts document content to `.txt`  
- preserves text structure with minimal formatting  

### PDF Renderer

- generates a valid PDF file
- writes the rendered artifact into the export storage bucket

### DOCX Renderer

- generates a valid DOCX file
- writes the rendered artifact into the export storage bucket

---

## Data Model

Export jobs are persisted under the API data directory:

```ts
{
  exportJobId: string;
  documentId: string;
  format: "txt" | "pdf" | "docx";
  status: "queued" | "running" | "succeeded" | "failed";
}
```

---

## Security Model (Download Flow)

The download endpoint returns a time-limited signed URL.

### Current behavior

- token generated using an HMAC over `documentId`, `exportId`, and expiry
- expiry time set to 15 minutes
- artifact endpoint validates the token and streams the stored file
- authenticated access is still required on the artifact endpoint

---

## Error Handling

### Export Not Found

```json
{
  "error": "export_not_found",
  "message": "Export job was not found for this document"
}
```

### Export Not Ready

```json
{
  "error": "export_not_ready",
  "message": "Export artifact is not ready for download"
}
```

---

## Design Decisions

- asynchronous export processing avoids blocking user requests  
- renderer abstraction allows adding new formats easily  
- local filesystem-backed object storage keeps the export contract real without adding more infrastructure dependencies  
- secure download flow separates artifact generation from retrieval  

---

## Future Work

- integrate export jobs with durable database storage  
- move the process-local export worker onto the shared queue infrastructure  
- replace the local filesystem bucket with external object storage  
