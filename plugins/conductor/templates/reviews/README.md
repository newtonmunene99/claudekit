# Code Reviews

Structured review documents that feed Conductor remediation programmes.

## Naming

`<scope-slug>_YYYYMMDD-review.md`

Examples:

- `<scope-slug>_YYYYMMDD-review.md`
- `<pkg>-module_YYYYMMDD-review.md`

## Required header fields

Every review MUST include:

```markdown
# Review — <title>

**Reviewed:** YYYY-MM-DD
**Scope:** <paths/modules>
**Context consulted:** <docs, knowledge bundles, external notes>
**Review type:** <e.g. product/API usability + code audit>
```

## Finding ID conventions

- Numbered sections: `§3.1`, `§4.2`
- Architecture items: `ARCH-1`, `ARCH-2`, …
- Addendum items: `B.1`, `C.3`, `D.5`, `E.2`

## Optional frontmatter (programme auto-detection)

```yaml
---
review_id: scope-slug_YYYYMMDD
finding_count: 25
axes: [trust, lifecycle, registry, docs, architecture]
programme_id: scope_remediation_YYYYMMDD
---
```

## Lifecycle

1. **Write review** — audit findings, no implementation
2. **Validate** — `/conductor:conductor-validate-review` produces `*_validation.md` sibling
3. **Programme** — `/conductor:conductor-new-track` from review → N tracks + sequencing table
4. **Implement** — `/conductor:conductor-implement` respecting `depends_on`
5. **Archive** — completed tracks may link review from `conductor/archive/<track_id>/index.md`

## Validation addendum

After `/conductor:conductor-validate-review`, a sibling file `<review-stem>_validation.md` records:

- Path verification per finding
- Severity confirmation (Confirmed | Partially confirmed | Disputed | Obsolete)

Programme creation requires validation addendum OR explicit user opt-out.
