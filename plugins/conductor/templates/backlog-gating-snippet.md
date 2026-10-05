# Backlog Gating Snippet Template

Reference OKF decision concepts in the local decision bundle, `.adr/decisions/<slug>.md`. Concept ID: `decisions/<slug>`.

## Gated backlog item

```markdown
### <ARCH-N> — <title> _(gated on the boundary decision)_

**Central type is defined in the [<title> decision](../../.adr/decisions/<slug>.md) OKF concept — do not spec before status is `accepted`.**

- OKF concept: `decisions/<slug>` at `.adr/decisions/<slug>.md`
- Gated on track: `<track_id>`
```

Adjust relative link path to match bundle location in the repo.
