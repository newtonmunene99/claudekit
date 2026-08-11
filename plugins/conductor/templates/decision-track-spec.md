# Decision Track Specification Template

Use for tracks with `track_role: decision`. Deliverable is an **OKF concept** in a **repo knowledge bundle** — not production code.

Follow [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md). Resolve bundle root via `templates/knowledge/bundle-placement-guide.md` (e.g. `<pkg>/knowledge/` for domain scope, `knowledge/` for repo-wide).

## Overview

Settle one architectural question and record it as a durable OKF decision concept at
**`<bundle-root>/decisions/<slug>.md`**.

## Functional Requirements

### 4. Spike protocol

- Run **`/conductor:conductor-prototype`** on `spike/<slug>` branch
- Capture verdict to `<bundle-root>/decisions/evidence/<slug>.md` (`type: Decision Evidence`)
- Delete spike branch before `conductor-sync-complete`

### 5. Decision concept (OKF deliverable)

- Run **`/engineering:grill-with-docs`** to produce `<bundle-root>/decisions/<slug>.md`
- Update `<bundle-root>/decisions/index.md` and `log.md`

## Allowed production edits

Correcting false claims in **domain OKF bundles** (e.g. `<pkg>/knowledge/packages/<component>.md`) — not runtime code.

## Acceptance criteria

- [ ] OKF decision concept at `<bundle-root>/decisions/<slug>.md` with required `type`
- [ ] Bundle root is repo-scoped (`knowledge/` or `<pkg>/knowledge/`), not `conductor/knowledge/` unless placement guide fallback applies
- [ ] Spike branch deleted; backlog references concept ID `decisions/<slug>`

## Engineering skill hooks

| Phase | Command |
| ----- | ------- |
| Stress-test options | `/engineering:grilling` |
| Background evidence | `/engineering:research` |
| Throwaway spike | `/conductor:conductor-prototype` |
| Write OKF concept | `/engineering:grill-with-docs` |
