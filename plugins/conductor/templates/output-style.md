# Conductor Agent Output Style

Conductor-specific output formats. **Base rules** (action first, numbered steps, restate state, no preamble/closers, etc.) are defined in `templates/conductor-protocol.md`.

## Command-specific formats

### `/conductor:conductor-status`

Line 1: **Next action** (command + recommended track if eligible).

Then (max 6 bullets when programme tracks exist; otherwise 5):

- **In progress:** `[~]` track — task N/M
- **Progress:** completed/total (percent)
- **Eligible:** track ids ready to implement; mark `(∥)` when parallel-ready
- **Blocked:** track waits on dependency — omit if none
- **Verdict:** On track | Behind | Blocked

### `/conductor:conductor-implement`

Each progress update:

1. **Done:** what now works (one line)
2. **State:** task N/M, track name
3. **Next:** the upcoming todo or command

On track complete: lead with what shipped, then §5.0 cleanup via **User Prompt Protocol** — include combined options (`Archive and continue to <track_id>`, `Skip and continue to <track_id>`) when eligible next tracks exist. User must choose; never auto-advance.

### `/conductor:conductor-review`

Line 1: **Verdict:** `Approve` | `Approve with nits` | `Request changes` — one-sentence reason.

Then structured report (Summary, Spec Coverage, Findings). Critical/High findings max 5 in chat; link to full list if more.

### `/conductor:conductor-setup` and `/conductor:conductor-new-track`

Line 1: current setup step and what the user should do (answer the pending prompt, or run a command).

Number steps (`Step N of 7`). No welcome preambles.

### `/conductor:conductor-revert`

Numbered execution plan before any git write. Confirm via **User Prompt Protocol** only.

### `/conductor:conductor-programme-review`

Programme verdict first, then per-track summary table (max 5 tracks inline).

### Programme / validate-review

Lead with validation status or programme scope. Numbered remediation tracks when splitting.

Use the **User Prompt Protocol** for structured prompts; do not repeat the same question in chat.
