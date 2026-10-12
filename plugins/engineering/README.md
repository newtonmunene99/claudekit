# Engineering Plugin

Engineering workflow skills for Claude Code, adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT).

Works with **Conductor** for remediation programmes; OKF knowledge lives **in the repo**, not only under `conductor/`.

## Install

```text
/plugin install engineering --marketplace newtonmunene99/claudekit
```

On Claude Code older than 2.1.275, add the marketplace first, then install:

```text
/plugin marketplace add https://github.com/newtonmunene99/claudekit
/plugin install engineering@claudekit
```

## Update

```text
/plugin marketplace update claudekit
/plugin update engineering@claudekit
/reload-plugins
```

From a shell: `claude plugin marketplace update claudekit && claude plugin update engineering@claudekit`, then restart Claude Code.

## Commands

| Command | Description |
| :------ | :---------- |
| `/engineering:grilling` | Stress-test a plan or decision |
| `/engineering:grill-with-docs` | Grilling + OKF knowledge / decision concepts |
| `/engineering:research` | Scoped, parallel-lane primary-source research → deduped, checked markdown |
| `/engineering:prototype` | Throwaway spike (use `/conductor:conductor-prototype` for decision tracks) |
| `/engineering:improve-codebase-architecture` | Deepening opportunities → HTML report |
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

## Decisions and glossary stay local

Decisions (ADRs, OKF decision concepts), spike evidence and the fallback glossary go to `.adr/` at the repo root, which holds a `.gitignore` with `*`. Nothing there is committed unless you ask. Project docs stay in repo knowledge bundles and are committed as usual.

## Context mapping

| Legacy | OKF default |
| ------ | ----------- |
| `docs/adr/` | `.adr/decisions/<slug>.md` |
| `GLOSSARY.md` | `conductor/context/product.md`, else `.adr/GLOSSARY.md` |
| Explore subagent | a sub-agent (the Explore agent where available) |

## Conductor integration

| Lifecycle | Command |
| --------- | ------- |
| Decision brainstorm | `/engineering:grilling` |
| Evidence | `/engineering:research` |
| Spike | `/conductor:conductor-prototype` |
| OKF decision concept | `/engineering:grill-with-docs` → `.adr/decisions/<slug>.md` |

## Attribution

Skills from [mattpocock/skills](https://github.com/mattpocock/skills). OKF from [Google Cloud](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing).
