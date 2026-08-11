# Tracks Programme Header Template

Insert once per programme in `conductor/context/tracks.md` before track entries.

```markdown
---

## <programme name> (<YYYY-MM-DD>)

<N> tracks derived from `<review path>`. **Order matters** — <one-line sequence summary>:

| Order | Track | Gates / gated by |
| ----- | ----- | ---------------- |
| 1 | **<A>** <short name> | <owns X → blocks Y and Z> |
| 2 | **<B>** <short name> | Needs A's <artifact>. Blocks <phase> |
| 3 | **<C>** <short name> | Needs A's <helpers>; phase C4 after B |
| ∥ | **<D>** <short name> | Parallel after A; needs A+B for id-keyed docs |
| ∥ | **<E>** <short name> | Independent decision track; blocks ARCH-N items |

---
```

## Track entry format (under programme)

```markdown
- [ ] **Track: <description>** — _order <N>; <sequencing hint>_
  *Spec: [../specs/<track_id>/spec.md](../specs/<track_id>/spec.md)*
  *Plan: [../plans/<slug>_<shortid>.plan.md](../plans/<slug>_<shortid>.plan.md)*
```

Use `∥` in the table for tracks that can run in parallel after their `depends_on` are satisfied.
