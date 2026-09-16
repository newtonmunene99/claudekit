---
name: conductor-status
description: Display project and track progress
disable-model-invocation: true
---

Follow `${CLAUDE_PLUGIN_ROOT}/templates/conductor-protocol.md` for file resolution, git policy, and output style.

# Conductor Status

## Claude Tool Mapping

- **User Prompt Protocol** for structured user prompts (AskUserQuestion tool when available, else numbered options in chat; wait for reply)
- **Read** / **Write** / **Edit** for file operations
- **Bash** for shell commands
- **Grep** / **Glob** for search
- Use relative paths under `conductor/` for all Conductor artifacts

## Output Style

Follow **Agent Output Style** in `templates/conductor-protocol.md` and `templates/output-style.md`.

**Status-specific:** Line 1 = next action (`/conductor:conductor-implement` or named track). Then max 6 bullets: in-progress track + task N/M, progress fraction, **Eligible** tracks (mark ∥ when parallel-ready), **Blocked** tracks with missing `depends_on` (omit if none), verdict (On track | Behind | Blocked).

Apply **Eligible Tracks Protocol** from templates/conductor-protocol.md when any track has `depends_on` or `programme_id` in metadata.

## Plugin Template Path

Locate plugin templates in this order:
1. `${CLAUDE_PLUGIN_ROOT}/templates/`
2. Fallback (local dev): `./plugins/conductor/templates/` from claudekit repo root

## Parsing Conductor Plans

Use the **Deterministic Plumbing Protocol** in templates/conductor-protocol.md — status is plumbing, not judgment:

1. `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" tracks` → registry, eligible / parallel-ready / blocked, recommended next track.
2. For each incomplete track with a `plan` path: `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" plan <plan>` → `counts`, `in_progress`, `next`, `phases`.
3. Only compose the summary from those JSON fields. Do not open plan files with the model unless the script fails (then fall back to counting `status:` lines by hand).

Per **Model Routing**, this skill is a cheap-model candidate: the only judgment is the one-word verdict.


## 1.0 SYSTEM DIRECTIVE
You are an AI agent. Your primary function is to provide a status overview of the current tracks file. This involves reading the **Tracks Registry** file, parsing its content, and summarizing the progress of tasks.

CRITICAL: Validate the result of every tool call. On failure, classify it with the **Failure Policy** in templates/conductor-protocol.md and apply that row (retry once, skip with a note, repair, isolate, or escalate). Halt only where the policy says **Stop**; never abort unrelated work because one step failed.

---


## 1.1 SETUP CHECK
**PROTOCOL: Verify that the Conductor environment is properly set up.**

1.  **Verify Core Context:** Using the **Universal File Resolution Protocol**, resolve and verify the existence of:
    -   **Tracks Registry**
    -   **Product Definition**
    -   **Tech Stack**
    -   **Workflow**

2.  **Handle Failure:**
    -   If ANY of these files are missing, you MUST halt the operation immediately.
    -   Announce: "Conductor is not set up. Please run `/conductor:conductor-setup` to set up the environment."
    -   Do NOT proceed to Status Overview Protocol.

---

## 2.0 STATUS OVERVIEW PROTOCOL
**PROTOCOL: Follow this sequence to provide a status overview.**

### 2.1 Read Project Plan
1.  **Run the scripts** per **Parsing Conductor Plans** above (`tracks`, then `plan` for each incomplete track). Both handle the standard `- [ ] **Track:` and legacy `## [ ] Track:` formats.
2.  **Fallback only:** if the script errors, resolve the **Tracks Registry** and each **Conductor plan file** via the **Universal File Resolution Protocol** and count todo `status` values by hand.

### 2.2 Parse and Summarize Plan
1.  **Parse Content:** From the JSON: `phases`, `counts`, `in_progress`, `next`.
2.  **Generate Summary:** Create a concise summary of the project's overall progress. This should include:
    -   The total number of major phases.
    -   The total number of tasks.
    -   The number of tasks completed, in progress, and pending.

### 2.3 Present Status Overview
1.  **Compute dependency state:** For programme tracks, apply **Eligible Tracks Protocol** in templates/conductor-protocol.md. Identify **eligible**, **parallel-ready** (lowest shared `order`), and **blocked** tracks.
2.  **Output Summary:** Follow **Output Style** above. Required fields:
    -   **Next action:** `/conductor:conductor-implement` when eligible tracks exist; name the recommended track (lowest `order`). If none eligible, say which blocker to clear first.
    -   **In progress:** `[~]` track — task N/M (or "none")
    -   **Progress:** tasks_completed/tasks_total across active programme or all tracks (percentage)
    -   **Eligible:** comma-separated track ids/descriptions; append `(∥)` when multiple parallel-ready
    -   **Blocked:** `<track>` waits on `<depends_on>` — omit section if none
    -   **Verdict:** On track | Behind | Blocked (one word + optional reason)
    -   Include current timestamp on its own line after the next-action line
3.  **Programme table:** When `tracks.md` has a sequencing table, one line: "See sequencing table in tracks.md for order."


