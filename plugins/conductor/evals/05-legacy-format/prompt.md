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

This file tracks all major tracks for the project.

---

## [~] Track: Scoped credentials and refresh validation for alis-build-iam
*Spec: [../specs/iamscoped_20260909/spec.md](../specs/iamscoped_20260909/spec.md)*
*Plan: [../plans/scoped-credentials_9f2c.plan.md](../plans/scoped-credentials_9f2c.plan.md)*
```

### `conductor/specs/iamscoped_20260909/spec.md`

```
# Spec

See the Conductor plan for scope and acceptance criteria.
```

### `conductor/plans/scoped-credentials_9f2c.plan.md`

```
---
name: "Scoped credentials and refresh validation for alis-build-iam"
overview: >-
  Port the restricted and authz_roles identity claims from go.alis.build/iam/v3 into packages/iam.
todos:
  - id: conductor-sync-in-progress
    content: "Conductor — Mark track in progress (tracks.md [~], metadata.json in_progress)"
    status: completed
  - id: identity-model-tests
    content: "Write failing tests for the restricted and authz_roles fields and the restricted privilege rule"
    status: completed
    phase: P1
  - id: identity-model-impl
    content: "Add restricted and authz_roles to Identity and gate is_privileged on restricted"
    status: completed
    phase: P1
  - id: phase-1-verify
    content: "Conductor - User Manual Verification 'P1 Identity model' (Protocol in workflow.md)"
    status: in_progress
    phase: P1
  - id: wire-format-tests
    content: "Write failing tests for the two new wire keys and the four-transport round-trip matrix"
    status: pending
    phase: P2
  - id: wire-format-impl
    content: "Emit authz_roles and restricted from dumps and decode them in _from_payload"
    status: pending
    phase: P2
  - id: phase-2-verify
    content: "Conductor - User Manual Verification 'P2 Wire format' (Protocol in workflow.md)"
    status: pending
    phase: P2
  - id: refresh-validation-tests
    content: "Write failing tests for a renewed token with a wrong audience, a bad signature, and a past expiry"
    status: pending
    phase: P3
  - id: refresh-validation-impl
    content: "Validate the access token returned by a refresh in both clients"
    status: pending
    phase: P3
  - id: conductor-sync-complete
    content: "Conductor — Mark track complete (tracks.md [x], metadata.json completed)"
    status: pending
isProject: true
---

> **Conductor plan:** Runnable directly in Claude Code or via `/conductor:conductor-implement`.

## Phases

- **P1 Identity model**
- **P2 Wire format**
- **P3 Refresh validation**
```

All files above must exist before the status protocol runs.
