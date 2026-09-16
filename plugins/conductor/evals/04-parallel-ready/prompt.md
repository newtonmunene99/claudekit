---
max_turns: 20
timeout_seconds: 300
allowed_tools: [Skill, Read, Glob, Grep, Write, "Bash(python3:*)"]
runs: 3
---
/conductor:conductor-status

Setup step first: this directory has no Conductor artifacts yet. Before running the setup check or any other part of the status protocol, create every file listed below exactly as shown, at the given path relative to the current directory. Do not add, rename, or reword anything in them. Only once every file exists, continue with the status protocol as normal.

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

## Q3 ports (2026-09-10)

| Order | Track | Gates / gated by |
| ----- | ----- | ---------------- |
| 1 | **lrocore_20260909** core, handlers, servers | Independent |
| 1 | **alogjson_20260910** structured logging | Independent |

---

- [ ] **Track: `lro` core — operations, handlers, servers** — _order 1_
  *Spec: [../specs/lrocore_20260909/spec.md](../specs/lrocore_20260909/spec.md)*
  *Plan: [../plans/lro-core_4d81.plan.md](../plans/lro-core_4d81.plan.md)*

- [ ] **Track: `alog` Cloud Logging JSON formatter and trace context** — _order 1_
  *Spec: [../specs/alogjson_20260910/spec.md](../specs/alogjson_20260910/spec.md)*
  *Plan: [../plans/alog-json_2c7e.plan.md](../plans/alog-json_2c7e.plan.md)*
```

### `conductor/specs/lrocore_20260909/metadata.json`

```
{
  "track_id": "lrocore_20260909",
  "type": "feature",
  "status": "pending",
  "created_at": "2026-09-09T14:17:28Z",
  "updated_at": "2026-09-09T15:08:27Z",
  "programme_id": "q3_ports_20260910",
  "order": 1,
  "depends_on": [],
  "blocks": [],
  "track_role": "implementation"
}
```

### `conductor/specs/alogjson_20260910/metadata.json`

```
{
  "track_id": "alogjson_20260910",
  "type": "feature",
  "status": "pending",
  "created_at": "2026-09-09T14:17:28Z",
  "updated_at": "2026-09-09T15:08:27Z",
  "programme_id": "q3_ports_20260910",
  "order": 1,
  "depends_on": [],
  "blocks": [],
  "track_role": "implementation"
}
```

### `conductor/plans/lro-core_4d81.plan.md`

```
---
name: "lro core: operations, handlers, servers"
overview: >-
  Port the cloud-free half of go.alis.build/lro/v2 into packages/lro.
programme_id: q3_ports_20260910
todos:
  - id: conductor-sync-in-progress
    content: "Conductor — Mark track in progress (tracks.md [~], metadata.json in_progress)"
    status: pending
  - id: scaffold-package
    content: "Scaffold packages/lro and register it in the root pyproject, README and bare-core check"
    status: pending
    phase: P1
  - id: verify-p1
    content: "Conductor - User Manual Verification 'P1 Foundation' (Protocol in workflow.md)"
    status: pending
    phase: P1
  - id: operation-tests
    content: "Write failing tests for operation-name validation, metadata round-trip, complete and fail"
    status: pending
    phase: P2
  - id: operation-impl
    content: "Implement OperationRecord, Operation and validate_operation_name"
    status: pending
    phase: P2
  - id: verify-p2
    content: "Conductor - User Manual Verification 'P2 Operation model' (Protocol in workflow.md)"
    status: pending
    phase: P2
  - id: client-tests
    content: "Write failing tests for Client construction, handler registration and operation CRUD"
    status: pending
    phase: P3
  - id: client-impl
    content: "Implement Client with the handler registry, new_operation and get_operation"
    status: pending
    phase: P3
  - id: verify-p3
    content: "Conductor - User Manual Verification 'P3 Client' (Protocol in workflow.md)"
    status: pending
    phase: P3
  - id: conductor-sync-complete
    content: "Conductor — Mark track complete (tracks.md [x], metadata.json completed)"
    status: pending
isProject: true
---

> **Conductor plan:** Runnable directly in Claude Code or via `/conductor:conductor-implement`.

## Phases

- **P1 Foundation** — scaffold-package
- **P2 Operation model** — operation pair
- **P3 Client** — client pair
```

### `conductor/plans/alog-json_2c7e.plan.md`

```
---
name: "alog: Cloud Logging JSON formatter and trace context"
overview: >-
  Port the structured logging half of go.alis.build/alog into packages/alog.
programme_id: q3_ports_20260910
todos:
  - id: conductor-sync-in-progress
    content: "Conductor — Mark track in progress (tracks.md [~], metadata.json in_progress)"
    status: pending
  - id: json-formatter-tests
    content: "Write failing tests for the Cloud Logging JSON formatter and severity mapping"
    status: pending
    phase: P1
  - id: json-formatter-impl
    content: "Implement the JSON formatter and severity mapping"
    status: pending
    phase: P1
  - id: verify-p1
    content: "Conductor - User Manual Verification 'P1 Formatter' (Protocol in workflow.md)"
    status: pending
    phase: P1
  - id: trace-context-tests
    content: "Write failing tests for trace and span extraction from the traceparent header"
    status: pending
    phase: P2
  - id: trace-context-impl
    content: "Implement trace context propagation into log records"
    status: pending
    phase: P2
  - id: verify-p2
    content: "Conductor - User Manual Verification 'P2 Trace context' (Protocol in workflow.md)"
    status: pending
    phase: P2
  - id: conductor-sync-complete
    content: "Conductor — Mark track complete (tracks.md [x], metadata.json completed)"
    status: pending
isProject: true
---

> **Conductor plan:** Runnable directly in Claude Code or via `/conductor:conductor-implement`.

## Phases

- **P1 Formatter** — json-formatter pair
- **P2 Trace context** — trace-context pair
```

### `conductor/specs/lrocore_20260909/spec.md`

```
# Spec

See the Conductor plan for scope and acceptance criteria.
```

### `conductor/specs/alogjson_20260910/spec.md`

```
# Spec

See the Conductor plan for scope and acceptance criteria.
```

All files above must exist before the status protocol runs.
