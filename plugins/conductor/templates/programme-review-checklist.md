# Programme Review Checklist

Use in `/conductor:conductor-review` programme mode or `/conductor:conductor-programme-review`.

## Trigger

- Args = programme name/id
- User asks to review remediation programme
- ≥3 tracks share same `programme_id` and are all `[ ]` or `[~]`

## Checklist

Run each item; record pass/fail with evidence.

1. **Sequencing table** in `tracks.md` matches `metadata.json` `depends_on` / `blocks` / `order` on every programme track.
2. **No duplicate owner** for same file/function concern across plans (dedup matrix or **Removed — owned by Track X** stubs present).
3. **Namespace single-owner** enforced — one track owns ID registry; others import only.
4. **All plan paths re-verified** — Path verification subsections present; no known-wrong paths.
5. **PREREQUISITE todos** present where tests would be vacuous without injectable seams.
6. **Decision track scaffold** — OKF bundle at resolved repo path (`<module>/knowledge/` or `knowledge/`), backlog gating for ARCH blockers.
7. **Todo counts** reasonable (10–16 per track); large validation tracks have phase labels.
8. **Docs tracks** declare `depends_on` namespace-owner before id-keyed content todos.

## Verdict

| Verdict | Meaning |
| ------- | ------- |
| **Programme ready** | All checklist items pass; safe to `/conductor:conductor-implement` in sequence |
| **Programme needs fix pass** | List blocking items; do not implement until resolved |

Report blocking items by track id with specific fix (path, dedup, prerequisite, or sequencing).
