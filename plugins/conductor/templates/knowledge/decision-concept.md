# OKF Decision Concept Template

Use for decision-track deliverables. Path: `.adr/decisions/<slug>.md` (concept ID `decisions/<slug>`), in the local **Decision Bundle** (see the protocol): `.adr/` ignores itself, so the decision is never committed unless the user asks.

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
scope: <optional package path the decision is about>
---

# <Title>
…
```

## Evidence concepts

`.adr/decisions/evidence/<slug>.md` with `type: Decision Evidence`.

## Allowed production edits (decision tracks)

Correcting false claims in **domain OKF bundles** (e.g. `<pkg>/knowledge/packages/<component>.md`) — not runtime code.
