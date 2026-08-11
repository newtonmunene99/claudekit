---
name: conductor-validate-review
description: Validate a code review document against the repository before creating a remediation programme
disable-model-invocation: true
---

Follow `${CLAUDE_PLUGIN_ROOT}/templates/conductor-protocol.md` for file resolution, git policy, and output style.

# Conductor Validate Review

## Claude Tool Mapping

- **User Prompt Protocol** for structured user prompts (AskUserQuestion tool when available, else numbered options in chat; wait for reply)
- **Read** / **Write** / **Edit** for file operations
- **Bash** for shell commands
- **Grep** / **Glob** for search
- Use relative paths under `conductor/` for all Conductor artifacts


## Output Style

Follow **Agent Output Style** in templates/conductor-protocol.md. Line 1 = validation status and count of findings checked.

## Plugin Template Path

Locate installed plugin templates:
1. `${CLAUDE_PLUGIN_ROOT}/templates/`
2. Fallback (local dev): `./plugins/conductor/templates/` from claudekit repo root
3. Fallback: `./plugins/conductor/templates/` from repo root

## 1.0 SYSTEM DIRECTIVE

Validate a review document in **Reviews Directory** against the codebase. Produce a validation addendum before `/conductor:conductor-new-track` programme creation.

**Read-only** until writing validation output. Git write operations follow **Git Write Policy**.

---

## 2.0 VALIDATION PROTOCOL

### 2.1 Resolve review

1. If `{{args}}` is non-empty, use as review path (relative to repo root or under `conductor/reviews/`).
2. Otherwise **User Prompt Protocol** — header "Review path", type text, placeholder `conductor/reviews/foo_YYYYMMDD-review.md`.
3. Verify file exists via Universal File Resolution.

### 2.2 Extract findings

Parse review for:

- **Location:** lines with file paths and line numbers
- **Severity** claims (Critical, High, ARCH-N, §X.Y)
- Inline backtick paths in finding bodies

Load `templates/review-document-header.md` for expected structure.

### 2.3 Verify paths

For each cited path:

1. `test -f` / `test -d` or glob variants
2. For line refs, `Read` file and confirm symbol/context
3. Record: **Verified** | **Wrong path** (suggest correction) | **Not found**

### 2.4 Verify severity claims

For each finding with code citation:

1. Read cited code
2. Mark: **Confirmed** | **Partially confirmed** | **Disputed** | **Obsolete**
3. Drop claims you cannot validate — do not flag uncertain items

### 2.5 Write validation addendum

Default: sibling file `<review-stem>_validation.md` (preserves original review).

**User Prompt Protocol** if user prefers append to review instead.

Addendum structure:

```markdown
# Validation — <review title>

**Source:** `conductor/reviews/<file>`
**Validated:** YYYY-MM-DD

## Path verification

| Finding | Cited path | Status | Correction |
| ------- | ---------- | ------ | ---------- |

## Severity confirmation

| ID | Verdict | Notes |
| -- | ------- | ----- |

## Blocking issues

List wrong paths or disputed Critical findings that must resolve before programme creation.

## Programme readiness

**Ready** | **Not ready** — <reason>
```

### 2.6 Halt rules

- **Blocking wrong paths** on Critical findings → announce halt; programme creation blocked until fixed
- User may opt out via the **User Prompt Protocol** when running `/conductor:conductor-new-track` (document opt-out in programme metadata)

### 2.7 Completion

Announce: "Validation written to `<path>`. Next: `/conductor:conductor-new-track` from this review."
