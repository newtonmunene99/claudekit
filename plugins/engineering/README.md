# Engineering Plugin

Engineering workflow skills for Claude Code, adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT).

Works with **Conductor** for remediation programmes; OKF knowledge lives **in the repo**, not only under `conductor/`.

## Commands

| Command | Description |
| :------ | :---------- |
| `/engineering:grilling` | Stress-test a plan or decision |
| `/engineering:grill-with-docs` | Grilling + OKF knowledge / decision concepts |
| `/engineering:research` | Scoped, parallel-lane primary-source research → deduped, checked markdown |
| `/engineering:prototype` | Throwaway spike (use `/conductor:conductor-prototype` for decision tracks) |
| `/engineering:improve-codebase-architecture` | Deepening opportunities → HTML report |
| `/engineering:codebase-design` | Deep-module design vocabulary and seam placement |
| `/engineering:domain-modeling` | Sharpen domain language and challenge the glossary |

## OKF knowledge (primary)

Project and domain documentation use [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) **in the repository**:

| Placement | When |
| --------- | ---- |
| `knowledge/` | Repo-wide project docs, cross-cutting decisions |
| `<module>/knowledge/` | Domain/package docs (e.g. `<pkg>/knowledge/`) |
| `conductor/knowledge/` | Fallback only — avoid for user-facing project docs |

**OKF layout:** `<bundle-root>/index.md`, concept frontmatter (`type`, `title`, `description`), bundle-relative links, optional `log.md`. See [OKF spec](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

When the user asks for knowledge or project docs, **discover or scaffold at repo scope** — load the Conductor plugin's bundle placement guide if Conductor is installed (`${CLAUDE_PLUGIN_ROOT}/../conductor/templates/knowledge/bundle-placement-guide.md`).

## Context mapping

| Legacy | OKF default |
| ------ | ----------- |
| `docs/adr/` | `<bundle-root>/decisions/<slug>.md` |
| `CONTEXT.md` | `conductor/context/product.md` or repo `CONTEXT.md` + OKF overview concepts |
| Explore subagent | `Task` + `subagent_type=explore` |

## Conductor integration

| Lifecycle | Command |
| --------- | ------- |
| Decision brainstorm | `/engineering:grilling` |
| Evidence | `/engineering:research` |
| Spike | `/conductor:conductor-prototype` |
| OKF decision concept | `/engineering:grill-with-docs` → `<bundle-root>/decisions/<slug>.md` |

## Attribution

Skills from [mattpocock/skills](https://github.com/mattpocock/skills). OKF from [Google Cloud](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing).
