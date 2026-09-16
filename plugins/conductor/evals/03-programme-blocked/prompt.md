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

## LRO port (2026-09-09)

| Order | Track | Gates / gated by |
| ----- | ----- | ---------------- |
| 1 | **lrocore_20260909** core, handlers, servers | Gates lrocloud |
| 2 | **lrocloud_20260909** Spanner and Cloud Tasks | Gated by lrocore |

---

- [ ] **Track: `lro` core — operations, handlers, servers** — _order 1_
  *Spec: [../specs/lrocore_20260909/spec.md](../specs/lrocore_20260909/spec.md)*
  *Plan: [../plans/lro-core_4d81.plan.md](../plans/lro-core_4d81.plan.md)*

- [ ] **Track: `lro` cloud backends — Spanner and Cloud Tasks** — _order 2; needs lrocore_20260909_
  *Spec: [../specs/lrocloud_20260909/spec.md](../specs/lrocloud_20260909/spec.md)*
  *Plan: [../plans/lro-cloud_6b3f.plan.md](../plans/lro-cloud_6b3f.plan.md)*
```

### `conductor/specs/lrocore_20260909/metadata.json`

```
{
  "track_id": "lrocore_20260909",
  "type": "feature",
  "status": "pending",
  "created_at": "2026-09-09T14:17:28Z",
  "updated_at": "2026-09-09T15:08:27Z",
  "programme_id": "lro_port_20260909",
  "order": 1,
  "depends_on": [],
  "blocks": [],
  "track_role": "implementation"
}
```

### `conductor/specs/lrocloud_20260909/metadata.json`

```
{
  "track_id": "lrocloud_20260909",
  "type": "feature",
  "status": "pending",
  "created_at": "2026-09-09T14:17:28Z",
  "updated_at": "2026-09-09T15:08:27Z",
  "programme_id": "lro_port_20260909",
  "order": 2,
  "depends_on": [
    "lrocore_20260909"
  ],
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
blocks: [lrocloud_20260909]
programme_id: lro_port_20260909
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

### `conductor/plans/lro-cloud_6b3f.plan.md`

```
---
name: "lro cloud backends: Spanner and Cloud Tasks"
overview: >-
  Complete the go.alis.build/lro/v2 port with the Spanner store and Cloud Tasks queue.
depends_on: [lrocore_20260909]
programme_id: lro_port_20260909
todos:
  - id: conductor-sync-in-progress
    content: "Conductor — Mark track in progress (tracks.md [~], metadata.json in_progress)"
    status: pending
  - id: proto-column-spike
    content: "PREREQUISITE: prove google-cloud-spanner can read and write a PROTO<google.longrunning.Operation> column via the mutation API; record the finding"
    status: pending
    phase: Q1
  - id: spanner-tests
    content: "Write failing tests for SpannerStore insert, read, update, table naming and not-found"
    status: pending
    phase: Q1
    blocked_by: [proto-column-spike]
  - id: spanner-impl
    content: "Implement SpannerStore behind the spanner extra"
    status: pending
    phase: Q1
    blocked_by: [proto-column-spike]
  - id: verify-q1
    content: "Conductor - User Manual Verification 'Q1 Spanner store' (Protocol in workflow.md)"
    status: pending
    phase: Q1
  - id: tasks-tests
    content: "Write failing tests for task idempotency, transient retry, AlreadyExists and permanent errors"
    status: pending
    phase: Q2
  - id: tasks-impl
    content: "Implement CloudTasksQueue behind the tasks extra"
    status: pending
    phase: Q2
  - id: async-tasks-tests
    content: "Write failing tests for the async queue over CloudTasksAsyncClient"
    status: pending
    phase: Q2
  - id: async-tasks-impl
    content: "Implement the async queue path on AsyncClient"
    status: pending
    phase: Q2
  - id: verify-q2
    content: "Conductor - User Manual Verification 'Q2 Cloud Tasks' (Protocol in workflow.md)"
    status: pending
    phase: Q2
  - id: wiring-tests
    content: "Write failing tests for client construction, scheduling failure marking the operation failed, and close()"
    status: pending
    phase: Q3
  - id: wiring-impl
    content: "Wire both backends into Client and AsyncClient and replace the placeholder cloud branch"
    status: pending
    phase: Q3
  - id: infra-readme
    content: "Document the Spanner schema, TTL policy, Terraform module and env mapping in the package README"
    status: pending
    phase: Q3
  - id: ship-gates
    content: "Extend check_bare_core.py for both extras, prove make check, check-bare and check-pip pass"
    status: pending
    phase: Q3
  - id: verify-q3
    content: "Conductor - User Manual Verification 'Q3 Wiring and docs' (Protocol in workflow.md)"
    status: pending
    phase: Q3
  - id: conductor-sync-complete
    content: "Conductor — Mark track complete (tracks.md [x], metadata.json completed)"
    status: pending
isProject: true
---

> **Conductor plan:** Runnable directly in Claude Code or via `/conductor:conductor-implement`.

## Phases

- **Q1 Spanner store** — proto-column-spike, spanner pair
- **Q2 Cloud Tasks** — tasks pair, async-tasks pair
- **Q3 Wiring and docs** — wiring pair, infra-readme, ship-gates
```

### `conductor/specs/lrocore_20260909/spec.md`

```
# Spec

See the Conductor plan for scope and acceptance criteria.
```

### `conductor/specs/lrocloud_20260909/spec.md`

```
# Spec

See the Conductor plan for scope and acceptance criteria.
```

All files above must exist before the status protocol runs.
