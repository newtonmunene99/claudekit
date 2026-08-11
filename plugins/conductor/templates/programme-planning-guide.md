# Conductor Programme Planning Guide

Use when `/conductor:conductor-new-track` enters **programme mode** (multi-finding review → N tracks). Load after specs and draft plans exist, before **Confirm Programme**.

Reference example: `docs/examples/remediation-programme-example.md`.

## Programme detection signals

| Signal | Action |
| ------ | ------ |
| User references `conductor/reviews/*.md` | Programme mode |
| Paste includes numbered findings (§3.x, ARCH-N, Addendum) | Programme mode |
| Description mentions "remediation", "review findings", or ≥6 distinct items | Programme mode |
| Otherwise | Single-track flow |

## Split vs monolith

After reading the review, use the **User Prompt Protocol**:

- **Default: split** when findings ≥ **6** OR span ≥ **3 axes**
- Options: Split into N tracks (recommended) | Single monolith | Custom split

### Axis classification

| Axis | Typical findings |
| ---- | ---------------- |
| **trust** | False-green, verdict, pass/fail semantics, empty cases |
| **lifecycle** | Cancel, teardown, client lifecycle, concurrency, evidence retention |
| **registry** | Validation, reserved IDs, identity, env freeze, numeric bounds |
| **docs** | Contracts, troubleshooting, reporter UX, README drift |
| **architecture** | Boundaries, package extraction, decision-only items (ARCH-N) |

Map each finding to one primary axis. Group adjacent axes into tracks when they share files.

## Validation prerequisite

Programme mode requires a review **validation addendum** (from `/conductor:conductor-validate-review`) OR explicit user opt-out via the **User Prompt Protocol** before split.

## Cross-track dedup matrix

Build before Confirm Programme:

| task/concern | tracks touching | owner | action |
| ------------ | ----------------- | ----- | ------ |

### Rules

1. **Same function/file + behavior** in two plans → one owner track. Non-owner plan gets:

   ```markdown
   ## Removed — owned by Track X
   - `task-id` — absorbed into Track X `other-task-id` (same functions in path/to/file.go)
   ```

2. **Synthetic IDs / reserved prefix / new package** → exactly one **namespace owner**. Others import `IsReserved`, constants — no parallel rename/enforcement.

3. **Duplicate test concerns** (duration math, rollup policy) → owner is the track that lands first in sequence.

## Namespace ownership

Assign one track as **namespace authority** when programme touches:

- Reserved ID prefixes (`_<prefix>.*`, etc.)
- New shared packages (`verdict`, etc.)
- Global registration validation

Owner plan includes **Namespace authority** section. Other tracks reference owner in `depends_on`.

## Sequencing edges

Set on each track `metadata.json`:

```json
{
  "programme_id": "<slug>_YYYYMMDD",
  "order": 1,
  "depends_on": ["owner_track_id"],
  "blocks": ["downstream_track_id"],
  "track_role": "implementation"
}
```

`track_role` values: `implementation` | `decision` | `docs`

### Sequencing table

Insert programme header in `tracks.md` from `templates/tracks-programme-header.md`. Each track entry adds inline hint: `— _order 2; after A, before C4_`

## Decision tracks

Spawn when review has **ARCH-N** findings that **block** future refactors (dependency language: "cannot spec until", "depends on boundary decision"):

- `track_role: decision`
- `deliverable: <bundle-root>/decisions/<slug>.md` (e.g. `<pkg>/knowledge/decisions/<slug>.md`)
- Scaffold OKF bundle at resolved repo path (see `templates/knowledge/bundle-placement-guide.md`)
- Append backlog gating for dependent ARCH items
- No production code except docs/knowledge corrections

## Prerequisite / vacuous-test scan

During synthesis, flag test todos that assume injectable seams. Insert `PREREQUISITE:` todos with vacuous-test evidence before dependent todos.

## Confirm Programme gate

Single **User Prompt Protocol** embedding:

1. Sequencing table
2. Dedup matrix
3. Path fix table (from path verification)
4. Decision track + backlog gating summary (if applicable)

Only write artifacts after approval.

## Write loop

For each track:

1. Write spec, plan, index, metadata (with programme fields)
2. Append to `tracks.md` under programme header
3. Decision track: scaffold OKF knowledge bundle + decisions index + log entries

Suggested commit: `chore(conductor): Add remediation programme '<programme_id>'`

## Implement and status

After programme write:

- **`/conductor:conductor-status`** — shows **Eligible**, **Parallel-ready** (∥), and **Blocked** tracks via **Eligible Tracks Protocol** (Conductor rule).
- **`/conductor:conductor-implement`** — picks among eligible tracks when several are unblocked; after each track, §5.0 cleanup offers combined options (`Archive and continue to <track_id>`, etc.) — user must confirm before the next track starts.
- Set matching `order` on parallel tracks (`∥` in sequencing table) so status and picker group them correctly.
