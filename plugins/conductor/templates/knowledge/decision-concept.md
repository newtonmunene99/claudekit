# OKF Decision Concept Template

Use for decision-track deliverables. Path is **inside the resolved knowledge bundle**.

Resolve bundle root via `templates/knowledge/bundle-placement-guide.md`:

| Scope | Example deliverable path | Concept ID |
| ----- | ------------------------ | ---------- |
| Domain package | `<pkg>/knowledge/decisions/<slug>.md` | `decisions/<slug>` |
| Repository | `knowledge/decisions/<slug>.md` | `decisions/<slug>` |

[okf]: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md

```markdown
---
type: Architecture Decision
title: <Short title>
description: <One sentence — what was decided>
tags: [architecture, <domain>]
timestamp: YYYY-MM-DDTHH:MM:SSZ
status: proposed
track: <track_id>
resource: <optional URI to primary code area>
---

# <Title>
…
```

## Evidence concepts

`<bundle-root>/decisions/evidence/<slug>.md` with `type: Decision Evidence`.

## Allowed production edits (decision tracks)

Correcting false claims in **domain OKF bundles** (e.g. `<pkg>/knowledge/packages/<component>.md`) — not runtime code.
