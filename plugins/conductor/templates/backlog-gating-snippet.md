# Backlog Gating Snippet Template

Reference OKF decision concepts in the **resolved knowledge bundle** (e.g. `<pkg>/knowledge/decisions/<slug>.md`). Concept ID: `decisions/<slug>`.

## Gated backlog item

```markdown
### <ARCH-N> — <title> _(gated on the boundary decision)_

**Central type is defined in the [<title> decision](../../<pkg>/knowledge/decisions/<slug>.md) OKF concept — do not spec before status is `accepted`.**

- OKF concept: `decisions/<slug>` at `<bundle-root>/decisions/<slug>.md`
- Gated on track: `<track_id>`
```

Adjust relative link path to match bundle location in the repo.
