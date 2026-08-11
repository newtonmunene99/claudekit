# Remediation Programme (Reference Example)

Anonymized case study for Conductor programme mode: ~25 review findings → five tracks (A–E).

## OKF placement (repo-scoped)

| Artifact | Location |
| -------- | -------- |
| Domain knowledge | `<pkg>/knowledge/` (packages, concepts, operations) |
| Decision deliverable (Track E) | `<pkg>/knowledge/decisions/<slug>.md` |
| Spike evidence | `<pkg>/knowledge/decisions/evidence/<slug>.md` |
| Conductor planning | `conductor/specs/`, `conductor/plans/`, `conductor/reviews/` |

Decision tracks **extend the domain bundle** beside code — not `conductor/knowledge/`.

## Programme tracks (illustrative)

| Order | Track | Role |
| ----- | ----- | ---- |
| 1 | A — Trust & policy | Namespace owner; blocks B, C |
| 2 | B — Lifecycle | Implementation; blocks C4 |
| 3 | C — Registry validation | Phased C1–C4 |
| ∥ | D — Docs | Parallel after A |
| ∥ | E — Boundary decision | OKF concept only; gates ARCH-N backlog items |

## Decision track E

- Deliverable: `<pkg>/knowledge/decisions/<slug>.md` (`type: Architecture Decision`)
- Correct false claims in existing concepts (e.g. `<pkg>/knowledge/packages/<component>.md`)
- Backlog gates dependent refactors on concept ID `decisions/<slug>`

See [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

## Workflow

```text
/conductor-validate-review conductor/reviews/<scope>_YYYYMMDD-review.md
/conductor-new-track remediation from <review>   # resolves bundle: <pkg>/knowledge/
/conductor-programme-review <programme_id>
/conductor-implement
```

When the user asks for **project docs**, discover `<pkg>/knowledge/` or repo `knowledge/` first; scaffold at the scope that matches the work.
