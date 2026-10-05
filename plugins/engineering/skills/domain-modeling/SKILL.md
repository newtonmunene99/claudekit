---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing the glossary (conductor/context/product.md or a GLOSSARY.md), or recording or editing a decision concept.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active* discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `conductor/context/product.md` (or `.adr/GLOSSARY.md` if present) for vocabulary is not this skill — that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## File structure

Decisions and the glossary are **local working records**, never committed unless the user asks. They live in `.adr/` at the repo root, an OKF bundle ([OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)) that ignores itself:

```
.adr/
├── .gitignore          ← one line: *
├── index.md
├── log.md
├── GLOSSARY.md         ← only when there is no conductor/context/product.md
└── decisions/
    ├── index.md
    └── <slug>.md       ← optional `scope: <pkg path>` frontmatter
```

`conductor/context/product.md` is the glossary in Conductor projects (already local: `conductor/` is gitignored). Otherwise the glossary is `.adr/GLOSSARY.md`.

Create `.adr/` lazily, on the first decision or glossary term, and write `.adr/.gitignore` with exactly `*` first. Never `git add` anything under `.adr/` unless the user asks for that file; then `git add -f <path>`.

Project and domain docs (overviews, package docs) are different: they live in OKF knowledge bundles in the repo (`knowledge/`, `<pkg>/knowledge/`) and are committed as usual. Legacy `docs/adr/` decisions migrate to `.adr/decisions/`. When Conductor is installed, its bundle placement guide has the details: try `${CLAUDE_PLUGIN_ROOT}/../conductor/templates/knowledge/bundle-placement-guide.md`, then `./plugins/conductor/templates/knowledge/bundle-placement-guide.md` in the claudekit repo.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `conductor/context/product.md` (or `.adr/GLOSSARY.md` if present), call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update the glossary inline

When a term is resolved, update `conductor/context/product.md` (or `.adr/GLOSSARY.md` if present) right there. Don't batch these up — capture them as they happen. Use the format in [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md).

`conductor/context/product.md` (or `.adr/GLOSSARY.md` if present) should be totally devoid of implementation details. Do not treat `conductor/context/product.md` (or `.adr/GLOSSARY.md` if present) as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer OKF decision concepts sparingly

Only offer to create an OKF decision concept when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the decision concept. Use [ADR-FORMAT.md](./ADR-FORMAT.md) (OKF decision shape).
