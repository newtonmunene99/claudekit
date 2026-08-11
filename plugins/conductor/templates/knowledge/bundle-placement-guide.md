# OKF Knowledge Bundle Placement

Use when the user asks for **knowledge**, **project docs**, **domain docs**, or when a decision track needs a deliverable concept.

Follow [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

## Priority order (resolve before writing)

1. **Existing bundle** — scan repo for `**/knowledge/index.md` (with or without `okf_version` in frontmatter). Use the bundle whose scope matches the work.
2. **Domain/package bundle** — when track, review, or user scope names a module (e.g. `<pkg>/`, `internal/auth/`), use `<pkg>/knowledge/`.
3. **Repo-root bundle** — when knowledge spans the whole project, use `knowledge/` at repository root.
4. **Fallback** — `conductor/knowledge/` only when no code domain applies (rare: user declines repo-root placement).

**Do not** default new project knowledge to `conductor/knowledge/` when the user asked for repo or domain documentation.

## Discovery (read-only)

```bash
find . -path './.git' -prune -o -path '*/knowledge/index.md' -print 2>/dev/null
```

Prefer the bundle whose path prefix matches the track spec **Scope**, review **Scope**, or user-stated module.

## Scaffold a new bundle

Copy from Conductor `templates/knowledge/`:

| File | Purpose |
| ---- | ------- |
| `index.md` | Bundle root — set `okf_version: "0.1"`, title, description for this scope |
| `log.md` | OKF update log |
| `decisions/index.md` | Decision concept listing (when decision tracks exist) |

**Repo root example:** `knowledge/index.md`, `knowledge/decisions/<slug>.md`

**Package example:** `<pkg>/knowledge/index.md`, `<pkg>/knowledge/decisions/<slug>.md`

Concept ID = path within bundle without `.md` (e.g. `decisions/<slug>`).

## Link from Conductor context

In `conductor/context/index.md`, link to repo knowledge bundles:

```markdown
## Knowledge (OKF)
- [Repository knowledge](../knowledge/)
- [<pkg> knowledge](../<pkg>/knowledge/) — when a domain bundle exists
```

## Decision track deliverable

Set `metadata.json` `deliverable` to the **resolved bundle path**, e.g.:

- `<pkg>/knowledge/decisions/<slug>.md`
- `knowledge/decisions/<slug>.md`

## Concept types (recommended)

| type | Use |
| ---- | --- |
| `Overview` | Mental model for a module |
| `Go Package` | Package reference (e.g. `<pkg>/knowledge/packages/<name>.md`) |
| `Architecture Decision` | Decision track deliverable |
| `Decision Evidence` | Spike/research from `/conductor:conductor-prototype` or `/engineering:research` |
| `Playbook` | Runbooks, operations |

Only `type` is required by OKF.

## When user asks for "project docs" or "knowledge base"

1. Discover existing bundles (step 1 above).
2. If none: **User Prompt Protocol** — repo-root `knowledge/` (recommended) vs domain `<pkg>/knowledge/`.
3. Scaffold OKF bundle at chosen path; commit beside code when possible.
4. Update bundle `log.md` and parent `index.md` sections.
