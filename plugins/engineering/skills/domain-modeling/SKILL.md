---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active* discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `conductor/context/product.md` (or repo-root `CONTEXT.md` if present) for vocabulary is not this skill — that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## File structure

**Conductor projects** use OKF knowledge bundles **in the repository** ([OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)):

```
knowledge/                    ← repo-wide (default for "project docs")
├── index.md
├── log.md
├── overview.md
└── decisions/
    └── <slug>.md

<pkg>/knowledge/              ← domain bundle (beside package code)
├── index.md
├── packages/
└── decisions/
    └── <slug>.md
```

`conductor/context/product.md` — Conductor glossary (not OKF).  
`conductor/knowledge/` — fallback only when no domain/repo bundle applies.

Legacy `docs/adr/` — migrate to OKF concepts in the appropriate bundle.

Create bundles lazily when the user asks for knowledge/project docs or when a decision track resolves its scope. Load the Conductor plugin's bundle placement guide when available — try `${CLAUDE_PLUGIN_ROOT}/../conductor/templates/knowledge/bundle-placement-guide.md` (both plugins ship in the claudekit marketplace), then `./plugins/conductor/templates/knowledge/bundle-placement-guide.md` in the claudekit repo. Skip if Conductor is not installed.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `conductor/context/product.md` (or repo-root `CONTEXT.md` if present), call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update CONTEXT.md inline

When a term is resolved, update `conductor/context/product.md` (or repo-root `CONTEXT.md` if present) right there. Don't batch these up — capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`conductor/context/product.md` (or repo-root `CONTEXT.md` if present) should be totally devoid of implementation details. Do not treat `conductor/context/product.md` (or repo-root `CONTEXT.md` if present) as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer OKF decision concepts sparingly

Only offer to create an OKF decision concept when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the decision concept. Use [ADR-FORMAT.md](./ADR-FORMAT.md) (OKF decision shape).
