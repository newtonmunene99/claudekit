---
name: conductor-implement
description: Execute tasks from a track's Conductor plan
disable-model-invocation: true
---

Follow `${CLAUDE_PLUGIN_ROOT}/templates/conductor-protocol.md` for file resolution, git policy, and output style.

# Conductor Implement

## Claude Tool Mapping

- **User Prompt Protocol** for structured user prompts (AskUserQuestion tool when available, else numbered options in chat; wait for reply)
- **Read** / **Write** / **Edit** for file operations
- **Bash** for shell commands
- **Grep** / **Glob** for search
- Use relative paths under `conductor/` for all Conductor artifacts

## Output Style

Follow **Agent Output Style** in `templates/conductor-protocol.md` and `templates/output-style.md`.

**Implement-specific:** Each progress message = (1) what now works, (2) task N/M + track name, (3) next todo. On errors: file:line, cause, fix. On track complete: lead with shipped outcome, then §5.0 cleanup **User Prompt Protocol** — include combined continue options when eligible next tracks exist (user must choose; never auto-advance).

## Plugin Template Path

Locate plugin templates in this order:
1. `${CLAUDE_PLUGIN_ROOT}/templates/`
2. Fallback (local dev): `./plugins/conductor/templates/` from claudekit repo root

## Conductor Plan Format

When creating or updating implementation plans, write to `conductor/plans/<slug>_<shortid>.plan.md` with this frontmatter:

```yaml
---
name: Track Title
overview: One-paragraph summary derived from spec
todos:
  - id: kebab-case-id
    content: "Task description"
    status: pending
isProject: true
---
```

- `status` values: `pending`, `in_progress`, `completed`
- On task completion, set `status: completed` and append commit SHA to `content`
- Markdown body below frontmatter carries phases, goals, architecture
- Register plan path in `conductor/context/tracks.md`

## Tracks Registry Format

Use this format in `conductor/context/tracks.md`:

```markdown
- [ ] **Track: Description**
  *Spec: [../specs/<track_id>/spec.md](../specs/<track_id>/spec.md)*
  *Plan: [../plans/<slug>_<shortid>.plan.md](../plans/<slug>_<shortid>.plan.md)*
```

Status markers: `[ ]` pending, `[~]` in progress, `[x]` complete.

## Todo Status Workflow

When executing tasks, update the plan file frontmatter:
1. Set `todos[].status` to `in_progress` before starting a task
2. Set `todos[].status` to `completed` and append ` (<sha>)` to `content` after commit
3. Follow `conductor/context/workflow.md` for TDD, git notes, and phase checkpoints


## 1.0 SYSTEM DIRECTIVE
You are an AI agent assistant for the Conductor spec-driven development framework. Your current task is to implement a track. You MUST follow this protocol precisely.

CRITICAL: Validate the result of every tool call. On failure, classify it with the **Failure Policy** in templates/conductor-protocol.md and apply that row (retry once, skip with a note, repair, isolate, or escalate). Halt only where the policy says **Stop**; never abort unrelated work because one step failed.

---

## 1.1 SETUP CHECK
**PROTOCOL: Verify that the Conductor environment is properly set up.**

1.  **Verify Core Context:** Using the **Universal File Resolution Protocol**, resolve and verify the existence of:
    -   **Product Definition**
    -   **Tech Stack**
    -   **Workflow**

2.  **Handle Failure:** If ANY of these are missing (or their resolved paths do not exist), Announce: "Conductor is not set up. Please run `/conductor:conductor-setup`." and HALT.


---

## 2.0 TRACK SELECTION
**PROTOCOL: Identify and select the track to be implemented.**

1.  **Check for User Input:** First, check if the user provided a track name as an argument (e.g., `/conductor-implement <track_description>`).

2.  **Locate and Parse Tracks Registry:**
    -   Run `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" tracks` from the project root (**Deterministic Plumbing Protocol**). Use its `tracks`, `eligible`, `blocked`, and `recommended` fields for every step below; do not re-parse the registry by hand unless the script is unavailable.
    -   **Fallback:** Resolve the **Tracks Registry** and parse each `- [ ] **Track:` (or legacy `## [ ] Track:`) entry for status, description, and spec link.
    -   **CRITICAL:** If `tracks` is empty, announce: "The tracks file is empty or malformed. No tracks to implement." and halt.

3.  **Continue:** Immediately proceed to the next step to select a track.

4.  **Select Track (Eligible Tracks Protocol):**
    -   **If a track name was provided:**
        1.  Perform an exact, case-insensitive match for the provided name against the track descriptions you parsed.
        2.  Resolve `<track_id>` and read `metadata.json`. If any `depends_on` track is not `[x]`, announce: "Track '<track_description>' is blocked. Complete `<missing_track_id>` first." Then use the **User Prompt Protocol** to pick from **eligible** tracks (see below) or halt.
        3.  If a unique match is found and not blocked, immediately use the **User Prompt Protocol** to confirm the selection (do not repeat the question in the chat):
            - **questions:**
                - **header:** "Confirm"
                - **question:** "I found track '<track_description>'. Is this correct?"
                - **type:** "yesno"
        4.  If no match is found, or if the match is ambiguous, immediately use the **User Prompt Protocol** to inform the user and request the correct track name (do not repeat the question in the chat):
            - **questions:**
                - **header:** "Clarify"
                - **question:** "I couldn't find a unique track matching the name you provided. Did you mean '<next_available_track>'? Or please type the exact track name."
                - **type:** "text"
    -   **If no track name was provided (or if the previous step failed):**
        1.  **Compute eligible tracks** per **Eligible Tracks Protocol** in templates/conductor-protocol.md.
        2.  **If no incomplete tracks:** Announce: "No incomplete tracks found. All tasks are completed!" and halt.
        3.  **If incomplete tracks exist but none are eligible:** Announce: "All incomplete tracks are blocked. Complete `<track_id>` first (see sequencing table in tracks.md)." and halt.
        4.  **If exactly one eligible track:** use the **User Prompt Protocol**:
            - **questions:**
                - **header:** "Next Track"
                - **question:** "Next eligible track: '<track_description>'. Proceed?"
                - **type:** "yesno"
            - If declined, use the **User Prompt Protocol** `text` for exact track name.
        5.  **If multiple eligible tracks:** use the **User Prompt Protocol** `choice` — one option per eligible track (label = track description; note **Parallel-ready** in description when sharing lowest `order`). Include option **Stop for now**. Put lowest-`order` track first (Recommended).
            - If user picks a track, proceed. If **Stop for now**, halt.

5.  **Handle No Selection:** If no track is selected, inform the user and await further instructions.

---

## 3.0 TRACK IMPLEMENTATION
**PROTOCOL: Execute the selected track.**

1.  **Announce Action:** One line: track name + first todo you are starting (no "I will now..." preamble).

2.  **Load Track Context:**
    a. **Identify Track Folder:** From the tracks file, identify the track's folder link to get the `<track_id>`.
    b. **Read Files:**
        -   **Track Context:** Using the **Universal File Resolution Protocol**, resolve and read the **Specification** and **Conductor plan file** for the selected track.
        -   **Workflow:** Resolve **Workflow** (via the **Universal File Resolution Protocol** using the project's index file).
    c. **Error Handling:** If you fail to read any of these files, you MUST stop and inform the user of the error.

3.  **Legacy Sync Fallback (only when the plan has no `conductor-sync-in-progress` todo):**
    -   Update **Tracks Registry** `- [ ]` → `- [~]`.
    -   Update `conductor/specs/<track_id>/metadata.json`: `status: in_progress`, refresh `updated_at`.
    -   If the plan already includes `conductor-sync-in-progress`, **skip this step** — the task loop owns sync.
    -   After this step, run **Git Isolation** per §3.0 step 4d before the task loop continues.

4.  **Execute Tasks and Update Track Plan:**
    a. **Announce:** One line: executing plan todos per **Workflow** (task index when known).
    b. **Iterate Through Tasks:** Before each task, run `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" plan <plan>` and take `next` — the first todo whose `blocked_by` are all completed (frontmatter order is the tie-break, not the rule). If `parallel_batch` is non-empty, run the **Parallel Dispatch Protocol** in templates/conductor-protocol.md (offer parallel via **User Prompt Protocol**; never assume). If `waiting` lists `unknown_blockers`, announce the misspelled id and ask before continuing. Track whether **Git Isolation** has run for the **current track** (`git_isolation_done`).
    c. **For Each Task:**
        i. **`conductor-sync-in-progress`:** Update registry `[~]`, metadata `in_progress`, refresh `updated_at`. Mark todo `completed`. Follow **Git Write Policy** for any commit. Then run **Git Isolation** per step d if not yet done.
        ii. **`conductor-sync-complete`:** For decision tracks (`track_role: decision` in metadata), verify no `spike/*` branch exists (`git branch --list 'spike/*'`). If spike branch exists, halt — run `/conductor:conductor-prototype` delete step first. Update registry `[x]`, metadata `completed`, refresh `updated_at`. Mark todo `completed`. Follow **Git Write Policy** to commit Conductor files.
        iii. **All other todos:** Before the first implementation todo, if sync-in-progress is satisfied (registry `[~]`) and **Git Isolation** has not run, execute step d. Then follow the **Workflow** task lifecycle.
           - **CRITICAL:** Human-in-the-loop steps in the **Workflow** MUST use **User Prompt Protocol**.
           - **Before commit:** Run the **Independent Verification Protocol** (fresh verifier subagent) per the **Workflow** step 6b.
           - **On test failure:** Follow the **Systematic Debugging Protocol** in the **Workflow**; persist `attempts` on the todo per **Convergence Budgets**.
           - **On any failure:** Apply the **Failure Policy** row; a failed todo never discards passing sibling work.
    d. **Git Isolation (once per track):** After sync-in-progress is satisfied and **before** any implementation todo or other Git write, follow the **Git Isolation Protocol** in templates/conductor-protocol.md. Set `git_isolation_done` after completing. Reset `git_isolation_done = false` when starting a new track via §5.0 continue options. Also run after step 3 legacy sync if the plan has no sync-in-progress todo.

5.  **Legacy Finalize Fallback (only when the plan has no `conductor-sync-complete` todo, or it remains pending after the loop):**
    -   Update **Tracks Registry** `[~]` → `[x]` and metadata `completed` if not already done.
    -   Follow **Git Write Policy** to commit Conductor files.
    -   Announce track completion.
    -   If the loop completed `conductor-sync-complete`, **skip this step**.

---

## 4.0 SYNCHRONIZE PROJECT DOCUMENTATION
**PROTOCOL: Update project-level documentation based on the completed track.**

1.  **Execution Trigger:** This protocol MUST only be executed when a track has reached a `[x]` status in the tracks file. DO NOT execute this protocol for any other track status changes.

2.  **Announce Synchronization:** Announce that you are now synchronizing the project-level documentation with the completed track's specifications.

3.  **Load Track Specification:** Read the track's **Specification**.

4.  **Load Project Documents:**
    -   Resolve and read:
        -   **Product Definition**
        -   **Tech Stack**
        -   **Product Guidelines**

5.  **Analyze and Update:**
    a.  **Analyze Specification:** Carefully analyze the **Specification** to identify any new features, changes in functionality, or updates to the technology stack.
    b.  **Update Product Definition:**
        i. **Condition for Update:** Based on your analysis, you MUST determine if the completed feature or bug fix significantly impacts the description of the product itself.
        ii. **Propose and Confirm Changes:** If an update is needed:
            -   **Ask for Approval:** Use the **User Prompt Protocol** to request confirmation. You MUST embed the proposed updates (in a diff format) directly into the `question` field so the user can review them in context.
                - **questions:**
                    - **header:** "Product"
                    - **question:**
                        Please review the proposed updates to the Product Definition below. Do you approve?

                        ---

                        <Insert Proposed product.md Updates/Diff Here>
                    - **type:** "yesno"
        iii. **Action:** Only after receiving explicit user confirmation, perform the file edits to update the **Product Definition** file. Keep a record of whether this file was changed.
    c.  **Update Tech Stack:**
        i. **Condition for Update:** Similarly, you MUST determine if significant changes in the technology stack are detected as a result of the completed track.
        ii. **Propose and Confirm Changes:** If an update is needed:
            -   **Ask for Approval:** Use the **User Prompt Protocol** to request confirmation. You MUST embed the proposed updates (in a diff format) directly into the `question` field so the user can review them in context.
                - **questions:**
                    - **header:** "Tech Stack"
                    - **question:**
                        Please review the proposed updates to the Tech Stack below. Do you approve?

                        ---

                        <Insert Proposed tech-stack.md Updates/Diff Here>
                    - **type:** "yesno"
        iii. **Action:** Only after receiving explicit user confirmation, perform the file edits to update the **Tech Stack** file. Keep a record of whether this file was changed.
    d. **Update Product Guidelines (Strictly Controlled):**
        i. **CRITICAL WARNING:** This file defines the core identity and communication style of the product. It should be modified with extreme caution and ONLY in cases of significant strategic shifts, such as a product rebrand or a fundamental change in user engagement philosophy. Routine feature updates or bug fixes should NOT trigger changes to this file.
        ii. **Condition for Update:** You may ONLY propose an update to this file if the track's **Specification** explicitly describes a change that directly impacts branding, voice, tone, or other core product guidelines.
        iii. **Propose and Confirm Changes:** If the conditions are met:
            -   **Ask for Approval:** Use the **User Prompt Protocol** to request confirmation. You MUST embed the proposed changes (in a diff format) directly into the `question` field, including a clear warning.
                - **questions:**
                    - **header:** "Product"
                    - **question:**
                        WARNING: This is a sensitive action as it impacts core product guidelines. Please review the proposed changes below. Do you approve these critical changes?

                        ---

                        <Insert Proposed product-guidelines.md Updates/Diff Here>
                    - **type:** "yesno"
        iv. **Action:** Only after receiving explicit user confirmation, perform the file edits. Keep a record of whether this file was changed.

6.  **Final Report:** One line per changed file (max 5). If none changed: "No doc updates needed." If any file changed, follow **Git Write Policy** before commit (`docs(conductor): Synchronize docs for track '<track_description>'`).
    - **Example (Product Definition changed):**
        > "Docs synced. **Product Definition** updated for the new feature. **Tech Stack** and **Product Guidelines** unchanged."
    - **Example (no changes):**
        > "Docs synced. No project doc updates needed for this track."

---

## 5.0 TRACK CLEANUP
**PROTOCOL: Offer cleanup and optional continue to the next eligible track in one confirmed choice.**

1.  **Execution Trigger:** This protocol MUST only be executed after the current track has been successfully implemented and the `SYNCHRONIZE PROJECT DOCUMENTATION` step is complete.

2.  **Compute next tracks:** Apply **Eligible Tracks Protocol** in templates/conductor-protocol.md **before** prompting. Record eligible `<track_id>` + description list; note **parallel-ready** (∥) when multiple share lowest `order`.

3.  **Ask for User Choice:** Build options dynamically, then use the **User Prompt Protocol** (do not repeat in chat):

    **Always include:**
    - **Review** — Run `/conductor:conductor-review` before finalizing.
    - **Archive** — Move track folder to `conductor/archive/`, remove from tracks file.
    - **Delete** — Permanently delete track folder and registry entry.
    - **Skip** — Leave completed track in tracks file; stop for now.

    **When eligible next tracks exist**, append combined options (user must explicitly choose — never auto-continue):
    - For each eligible track (cap at **2** in this prompt; if more than 2 eligible, include only the two lowest-`order` tracks here):
        - Label: `Skip and continue to <track_id>`, Description: `<track_description>` + `(∥)` when parallel-ready. Leave completed track in registry; start implementing next track.
        - Label: `Archive and continue to <track_id>`, Description: Archive completed track, then implement `<track_description>`.
    - If **>2 eligible** tracks, also add:
        - Label: `Choose next track…`, Description: Pick among all eligible tracks (follow-up **User Prompt Protocol**).

    Put the **recommended** next track (lowest `order`) first among continue options.

    - **questions:**
        - **header:** "Track Cleanup"
        - **question:** "Track '<track_description>' is complete. What would you like to do?" + if eligible exist: append one line listing eligible ids.
        - **type:** "choice"
        - **multiSelect:** false

4.  **Handle User Response:**

    *   **Review:** Announce: "Run `/conductor:conductor-review` to verify changes. You can archive or continue afterward." Halt.

    *   **Archive** (standalone): Execute archive steps (4a), commit, announce success. Halt.

    *   **Delete** (standalone): Confirm via the **User Prompt Protocol** `yesno`, then delete steps (4b). Halt unless cancelled.

    *   **Skip** (standalone): Announce completed track remains in tracks file. Halt.

    *   **Skip and continue to `<track_id>`:** Announce leaving completed track in registry. Go to **§5.1 Continue** with that `<track_id>`.

    *   **Archive and continue to `<track_id>`:** Execute archive steps (4a), commit, announce archived. Go to **§5.1 Continue** with that `<track_id>`.

    *   **Choose next track…:** use the **User Prompt Protocol** `choice` — one option per eligible track + **Stop for now**. On track pick → if user also wants archive first, use the **User Prompt Protocol** `yesno`: "Archive '<completed_track>' before continuing?" — on yes run 4a then §5.1; on no §5.1. On stop → halt.

    **4a. Archive steps:**
    i. Create `conductor/archive/` if missing.
    ii. Move `<Specs Directory>/<track_id>` → `conductor/archive/<track_id>`.
    iii. Remove completed track section from **Tracks Registry**.
    iv. Follow **Git Write Policy** — message: `chore(conductor): Archive track '<track_description>'`.

    **4b. Delete steps:** (after yes on confirm)
    a. Delete `<Specs Directory>/<track_id>`.
    b. Remove track section from **Tracks Registry**.
    c. Follow **Git Write Policy** — message: `chore(conductor): Delete track '<track_description>'`.

---

## 5.1 CONTINUE TO NEXT TRACK
**PROTOCOL: Jump to the next selected track after explicit user choice in §5.0.**

1.  Resolve `<track_id>` against **Tracks Registry** and metadata. If no longer eligible (race), recompute per **Eligible Tracks Protocol** and use the **User Prompt Protocol** to pick again or halt.

2.  Set `git_isolation_done = false`.

3.  Go to **§3.0 TRACK IMPLEMENTATION** for the selected track.

4.  **Loop:** After §3.0 → §4.0 → §5.0, user may again choose a combined continue option until no eligible tracks remain or they pick a standalone halt option.

