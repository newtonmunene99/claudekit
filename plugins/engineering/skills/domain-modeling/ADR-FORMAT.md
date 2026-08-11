# OKF Decision Concepts

Replaces numbered ADRs in `docs/adr/`. See [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

## Where decisions live (repo-scoped)

| Scope | Bundle root | Deliverable path | Concept ID |
| ----- | ----------- | ---------------- | ---------- |
| Domain package | `<pkg>/knowledge/` | `<pkg>/knowledge/decisions/<slug>.md` | `decisions/<slug>` |
| Repository | `knowledge/` | `knowledge/decisions/<slug>.md` | `decisions/<slug>` |
| Fallback | `conductor/knowledge/` | only when no code domain applies |

Discover existing bundles: `**/knowledge/index.md`. Prefer extending an existing domain bundle over creating `conductor/knowledge/`.
