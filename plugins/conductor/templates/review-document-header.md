# Review Document Header Template

Optional YAML frontmatter + markdown header for `conductor/reviews/<slug>_YYYYMMDD-review.md`.

```yaml
---
review_id: <scope-slug>_YYYYMMDD
finding_count: 0
axes: [trust, lifecycle, registry, docs, architecture]
programme_id:
---
```

```markdown
# Review — <title>

**Reviewed:** YYYY-MM-DD
**Scope:** <paths/modules included in audit>
**Context consulted:** <repository docs, knowledge bundles, external architecture notes>
**Review type:** <e.g. product/API usability review plus code and documentation audit. No implementation changes were made.>

---

## 1. Executive verdict

**<One-line verdict>**

### Highest-priority changes

1. …
2. …

---

## 2. Critical findings

### 2.1 <title>

**Severity:** Critical
**Location:** `path/to/file.go`, `other/pkg/foo.go:123`

…

---

## 3. Architecture findings

### ARCH-1 — <title>

…

---

## Addendum (optional)

Additional findings discovered during validation or second-pass review.
```

After drafting, run `/conductor:conductor-validate-review` before creating a remediation programme.
