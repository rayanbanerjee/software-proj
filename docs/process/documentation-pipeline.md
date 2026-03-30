# Documentation Pipeline

## Purpose

This project is intended to be worked on heavily by AI agents and humans in parallel. Documentation is therefore part of the delivery path, not an optional afterthought.

This pipeline exists to:

- keep architectural intent stable across many short-lived agent sessions
- make handoffs cheap and low-risk
- separate durable decisions from temporary execution notes
- reduce duplicate exploration across agents
- give CI a minimal structure it can enforce

## Working agreement

Every meaningful change should update code and docs together. If a task changes behavior, interfaces, architecture, or operating assumptions, the same branch should include the corresponding documentation update.

## Document types

### `docs/adr/`

Use ADRs for decisions that change architecture, package boundaries, persistence models, protocols, or core operational behavior.

Examples:

- choosing NestJS vs Fastify
- choosing Yjs transport topology
- deciding snapshot format
- changing auth/session model

### `docs/specs/`

Use specs for implementation-facing designs that are more concrete than ADRs and more stable than task notes.

Examples:

- document session lifecycle
- AI proposal apply flow
- permission propagation contract

### `docs/api/`

Use for endpoint contracts, event schemas, payload examples, and integration notes.

### `docs/tasks/`

Use one file per active or completed scoped initiative. A task doc is the execution hub for human and agent collaboration.

The shared backlog for planning and Notion sync lives in:

- `docs/process/task-backlog.md`
- `docs/process/notion-backlog.csv`

Each task should capture:

- goal
- scope and explicit non-goals
- current status
- dependencies
- implementation notes
- linked ADRs/specs/PRs or commits

### `docs/handoffs/`

Use for short-lived progress transfers between agents or between an agent and a human.

Handoffs should be concise and tactical:

- what was done
- current state
- blockers or risks
- exact next steps
- files touched

### `docs/changes/`

Use for high-signal change summaries that help future agents quickly understand what landed without reading every commit first.

Good candidates:

- first implementation of a subsystem
- contract-breaking changes
- major refactors
- changes that require downstream follow-up

## Required workflow

### 1. Starting a non-trivial task

Create a task file from `docs/templates/task-template.md`.

Naming:

- `docs/tasks/TASK-0001-short-name.md`
- increment the numeric identifier

### 2. Making an architectural or durable product decision

Create or update an ADR from `docs/templates/adr-template.md`.

Rules:

- one ADR per distinct decision
- use `Proposed`, `Accepted`, `Superseded`, or `Deprecated`
- link affected tasks and specs

### 3. Defining implementation details

Add or update a spec in `docs/specs/` when code structure, event flow, data model, or API behavior needs stable explanation beyond inline comments.

### 4. Working in parallel

Before an agent stops or hands off work, create or update a handoff note from `docs/templates/handoff-template.md`.

Naming:

- `docs/handoffs/YYYY-MM-DD-topic.md`

### 5. Landing a significant change

Add a change note from `docs/templates/change-template.md` when the result would otherwise be expensive for the next agent to rediscover.

Naming:

- `docs/changes/YYYY-MM-DD-short-name.md`

## Minimum documentation rules by change type

| Change type | Required documentation |
| --- | --- |
| New feature or subsystem | task doc + change note |
| Architecture decision | ADR + task doc |
| API or event contract change | `docs/api/*` update + change note |
| Large refactor | task doc + handoff or change note |
| Bug fix with non-obvious root cause | change note |
| Temporary exploration only | handoff note if pausing |

## Agent operating rules

Agents should:

- read the relevant task, ADR, spec, and latest handoff before editing code
- read the shared backlog before creating new task IDs
- avoid creating duplicate task files for the same scope
- update existing docs instead of forking truth into multiple places
- leave a handoff note when stopping mid-task
- state assumptions explicitly when repo context is incomplete

Agents should not:

- encode durable architecture decisions only in handoff notes
- treat task docs as changelogs
- leave API behavior only in code comments if another service will consume it

## Pull request or commit checklist

- code changes reflected in the correct doc type
- new decisions captured in ADRs when needed
- task status updated
- handoff added if work is partial
- change note added for major outcomes
- documentation check passes

## Directory map

- `docs/process/`: repository process and collaboration policy
- `docs/process/task-backlog.md`: canonical backlog for planning and triage
- `docs/process/notion-backlog.csv`: Notion-importable task list
- `docs/templates/`: canonical templates
- `docs/tasks/`: task trackers
- `docs/handoffs/`: tactical execution transfer notes
- `docs/changes/`: durable implementation summaries
- `docs/specs/`: subsystem specs
- `docs/adr/`: architecture decision records
- `docs/api/`: interface and contract docs
- `docs/diagrams/`: rendered or source diagrams
