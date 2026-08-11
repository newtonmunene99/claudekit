---
okf_version: "0.1"
type: Knowledge Bundle
title: <Repository or module title> — Knowledge
description: OKF v0.1 knowledge bundle — curated project insight for humans and agents.
tags: [knowledge]
timestamp: YYYY-MM-DDTHH:MM:SSZ
---

# <Scope title>

This bundle follows [Open Knowledge Format (OKF) v0.1][okf-spec]. Concepts are
markdown files with YAML frontmatter; cross-links use bundle-relative paths
(starting with `/`).

Place this file at **`knowledge/index.md`** (repo root) or **`<module>/knowledge/index.md`**
(domain scope) — not under `conductor/` unless no code domain exists.

[okf-spec]: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md

# Contents

* [Overview](/overview.md) — mental model (create when scoping the bundle)
* [Decisions](/decisions/) — architecture decisions (`type: Architecture Decision`)

# Conventions

- Every concept document requires a `type` field in frontmatter.
- Decision deliverables use `type: Architecture Decision`.
- Supersede by new concept — do not rewrite history in place.
- Update [log.md](/log.md) when adding or changing concepts.
