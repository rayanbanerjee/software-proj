# Export Pipeline Specification

## Overview

The export pipeline enables users to request document exports in multiple formats (txt, pdf, docx), track export status, and retrieve a downloadable artifact through a secure URL.

This pipeline follows an asynchronous job model aligned with the system architecture, where export requests are handled via API endpoints and processed by a background worker.

---

## High-Level Flow

1. User requests export via API  
2. API creates an export job and returns a job ID  
3. Worker processes the export job asynchronously  
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
  "exportId": "exp_...",
  "status": "pending"
}
```

---

### 2. Get Export Status

**GET /documents/{id}/exports/{exportId}**

#### Response

```json
{
  "exportId": "exp_...",
  "documentId": "doc1",
  "format": "pdf",
  "status": "pending" | "completed" | "failed"
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
- generate export artifact (stubbed for now)  
- update job status  

---

## Renderers

The system supports multiple export formats via dedicated renderers:

### Plain Text Renderer

- converts document content to `.txt`  
- preserves text structure with minimal formatting  

### PDF Renderer (Stub)

- returns placeholder content  
- simulates PDF generation  

### DOCX Renderer (Stub)

- returns placeholder content  
- simulates DOCX generation  

---

## Data Model (Current Stub)

Export jobs are currently stored in-memory:

```ts
{
  exportId: string;
  documentId: string;
  format: "txt" | "pdf" | "docx";
  status: "pending" | "completed" | "failed";
}
```

This will later be replaced by persistent storage (e.g., database).

---

## Security Model (Download Flow)

The download endpoint returns a time-limited signed URL.

### Current behavior (stub)

- token generated using hash(documentId + exportId + expiry)  
- expiry time set to 15 minutes  
- no validation yet  

### Future improvements

- validate token on download endpoint  
- integrate with object storage signed URLs (e.g., S3)  
- enforce access control based on user permissions  

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
- stubbed implementations enable early integration without infrastructure dependencies  
- secure download flow separates artifact generation from retrieval  

---

## Future Work

- integrate export jobs with persistent database storage  
- connect worker to real job queue (BullMQ)  
- generate actual PDF and DOCX files  
- upload artifacts to object storage  
- implement authenticated download endpoints  
- support large document exports and streaming  
