---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates OKF repo knowledge as we go.
---

Run a `/engineering:grilling` session, using the **domain-modeling** skill.

**Decisions are local.** They go to the decision bundle `.adr/` at the repo root, which carries a `.gitignore` with `*`: never commit anything there unless the user asks (`git add -f <path>`). Create it lazily, `.gitignore` first.

- Decision concepts: `.adr/decisions/<slug>.md` (`type: Architecture Decision`, optional `scope: <pkg path>`)
- See Conductor's decision-concept template (`${CLAUDE_PLUGIN_ROOT}/../conductor/templates/knowledge/decision-concept.md`) and [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- Update `.adr/decisions/index.md` and `.adr/log.md`

When the user asks for **project docs** or **knowledge**, scaffold or extend the appropriate repo bundle — discover existing `**/knowledge/index.md` first.

Glossary terms: `conductor/context/product.md` or `.adr/GLOSSARY.md` — not a substitute for OKF concept docs.
