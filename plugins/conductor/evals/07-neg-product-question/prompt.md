---
max_turns: 15
timeout_seconds: 240
allowed_tools: [Skill, Read, Glob, Grep, Write]
runs: 3
---
The Conductor artifacts for this project are listed below. Before anything else, create every file exactly as shown, at the given path relative to the current directory. Do not add, rename, or reword anything in them.

### `conductor/context/product.md`

```
# Product

alis-build Python packages: `iam`, `alog`, `lro`. Ports of the Go modules under go.alis.build.
```

### `conductor/context/tech-stack.md`

```
# Tech stack

Python 3.12, uv workspaces, pytest, ruff. Optional extras per Google client.
```

### `conductor/context/workflow.md`

```
# Workflow

TDD per todo. User manual verification closes each phase. Conductor sync todos bookend every plan.
```

### `conductor/context/tracks.md`

```
# Project Tracks

This file tracks all major tracks for the project. Each track has its own spec and Conductor plan.

---

- [x] **Track: `lro` cloud backends — Spanner and Cloud Tasks** — _order 2_
  *Spec: [../specs/lrocloud_20260909/spec.md](../specs/lrocloud_20260909/spec.md)*
  *Plan: [../plans/lro-cloud_6b3f.plan.md](../plans/lro-cloud_6b3f.plan.md)*
```

### `conductor/specs/lrocloud_20260909/metadata.json`

```
{
  "track_id": "lrocloud_20260909",
  "type": "feature",
  "status": "completed",
  "created_at": "2026-09-09T14:17:28Z",
  "updated_at": "2026-09-09T15:08:27Z",
  "programme_id": "lro_port_20260909",
  "order": 2,
  "depends_on": [],
  "blocks": [],
  "track_role": "implementation"
}
```

### `conductor/plans/lro-cloud_6b3f.plan.md`

```
---
name: "lro cloud backends: Spanner and Cloud Tasks"
overview: >-
  Complete the go.alis.build/lro/v2 port with the Spanner store and Cloud Tasks queue.
programme_id: lro_port_20260909
todos:
  - id: conductor-sync-in-progress
    content: "Conductor — Mark track in progress (tracks.md [~], metadata.json in_progress)"
    status: completed
  - id: proto-column-spike
    content: "PREREQUISITE: prove google-cloud-spanner can read and write a PROTO<google.longrunning.Operation> column via the mutation API; record the finding"
    status: completed
    phase: Q1
  - id: spanner-tests
    content: "Write failing tests for SpannerStore insert, read, update, table naming and not-found"
    status: completed
    phase: Q1
    blocked_by: [proto-column-spike]
  - id: spanner-impl
    content: "Implement SpannerStore behind the spanner extra"
    status: completed
    phase: Q1
    blocked_by: [proto-column-spike]
  - id: verify-q1
    content: "Conductor - User Manual Verification 'Q1 Spanner store' (Protocol in workflow.md)"
    status: completed
    phase: Q1
  - id: tasks-tests
    content: "Write failing tests for task idempotency, transient retry, AlreadyExists and permanent errors"
    status: completed
    phase: Q2
  - id: tasks-impl
    content: "Implement CloudTasksQueue behind the tasks extra"
    status: completed
    phase: Q2
  - id: async-tasks-tests
    content: "Write failing tests for the async queue over CloudTasksAsyncClient"
    status: completed
    phase: Q2
  - id: async-tasks-impl
    content: "Implement the async queue path on AsyncClient"
    status: completed
    phase: Q2
  - id: verify-q2
    content: "Conductor - User Manual Verification 'Q2 Cloud Tasks' (Protocol in workflow.md)"
    status: completed
    phase: Q2
  - id: wiring-tests
    content: "Write failing tests for client construction, scheduling failure marking the operation failed, and close()"
    status: completed
    phase: Q3
  - id: wiring-impl
    content: "Wire both backends into Client and AsyncClient and replace the placeholder cloud branch"
    status: completed
    phase: Q3
  - id: infra-readme
    content: "Document the Spanner schema, TTL policy, Terraform module and env mapping in the package README"
    status: completed
    phase: Q3
  - id: ship-gates
    content: "Extend check_bare_core.py for both extras, prove make check, check-bare and check-pip pass"
    status: completed
    phase: Q3
  - id: verify-q3
    content: "Conductor - User Manual Verification 'Q3 Wiring and docs' (Protocol in workflow.md)"
    status: completed
    phase: Q3
  - id: conductor-sync-complete
    content: "Conductor — Mark track complete (tracks.md [x], metadata.json completed)"
    status: completed
isProject: true
---

> **Conductor plan:** Runnable directly in Claude Code or via `/conductor:conductor-implement`.

## Phases

- **Q1 Spanner store** — proto-column-spike, spanner pair
- **Q2 Cloud Tasks** — tasks pair, async-tasks pair
- **Q3 Wiring and docs** — wiring pair, infra-readme, ship-gates
```

### `conductor/specs/lrocloud_20260909/spec.md`

```
# Spec

See the Conductor plan for scope and acceptance criteria.
```

When every file above exists: which Python packages does this project ship? Answer in one or two sentences from the product definition.
