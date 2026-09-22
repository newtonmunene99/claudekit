---
name: conductor-implement
description: Execute the next todos of a Conductor track plan (conductor/plans/*.plan.md) with TDD, commits, and phase checkpoints. Use when the user asks to implement, continue, resume, or proceed with a Conductor track or its next task, including after a context compaction in the middle of a track.
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

## Keep-Going Rule

A progress message is not the end of a turn. After reporting a todo, start the next one in the same turn. The turn ends only when:

- a hand check needs the user (workflow phase protocol step 6),
- an escalation or a decision needs the user (**Failure Policy**, a design question),
- a git prompt is required (**Commit approval** `each`, or a push, merge, or tag),
- **Autonomy** in **Working Agreements** says to pause here (`phase` or `todo`), or
- the track is complete (§5.0).

Never end a turn on "Continuing to…", "Carrying on…", or "Want me to keep going?". If the user interjects with a side request mid-track, handle it, then re-run `conductor_state.py plan` and continue with `next` unless they said to stop. Never ask how often to check in: that is **Autonomy**.

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

- `status` values: `pending`, `in_progress`, `completed`, `deferred` (a phase hand check the user postponed; it blocks nothing), and `blocked` (waiting on something outside the plan; `blocked_on` says what)
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

3.  **Working Agreements:** Read them per the **Working Agreements Protocol** in templates/conductor-protocol.md. If the **Workflow** has no Working Agreements section, add it now (protocol rule 4) before selecting a track.


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
        1.  Match the argument against each track's `track_id` first (exact, case-insensitive), then against the track descriptions.
        2.  Resolve `<track_id>` and read `metadata.json`. If any `depends_on` track is not `[x]`, announce: "Track '<track_description>' is blocked. Complete `<missing_track_id>` first." Then use the **User Prompt Protocol** to pick from **eligible** tracks (see below) or halt.
        3.  **Exact `track_id` match, not blocked:** announce the track in one line and proceed. Do not ask for confirmation.
        4.  **Unique description match only, not blocked:** use the **User Prompt Protocol** to confirm the selection (do not repeat the question in the chat):
            - **questions:**
                - **header:** "Confirm"
                - **question:** "I found track '<track_description>'. Is this correct?"
                - **type:** "yesno"
        5.  **No match, or an ambiguous match:** if the argument reads like a new piece of work rather than a track name, offer to create it: use the **User Prompt Protocol** with options **Create a new track** (then run `/conductor:conductor-new-track` with the argument) and **Pick an existing track**. Otherwise ask for the exact track name (do not repeat the question in the chat):
            - **questions:**
                - **header:** "Clarify"
                - **question:** "I couldn't find a unique track matching the name you provided. Did you mean '<next_available_track>'? Or please type the exact track name."
                - **type:** "text"
    -   **If no track name was provided (or if the previous step failed):**
        1.  **Compute eligible tracks** per **Eligible Tracks Protocol** in templates/conductor-protocol.md.
        2.  **If no incomplete tracks:** Announce: "No incomplete tracks found. All tasks are completed!" and halt.
        3.  **If incomplete tracks exist but none are eligible:** Announce: "All incomplete tracks are blocked. Complete `<track_id>` first (see sequencing table in tracks.md)." and halt.
        4.  **If exactly one eligible track:** announce it in one line ("Implementing '<track_description>' (`<track_id>`), the only eligible track.") and proceed without asking. Running implement is the confirmation.
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
        -   **Resume section:** If the plan body ends with a `## Resume` section (written by `/conductor:conductor-handoff`), read it first: start from its **Next** todo, trust its **Verified** facts, re-check its **Unverified** ones, and resolve **Unrecorded commits** before anything else. Delete the section once the first todo of this session completes; it is stale after that.
        -   **Workflow:** Resolve **Workflow** (via the **Universal File Resolution Protocol** using the project's index file).
    c. **Error Handling:** If you fail to read any of these files, you MUST stop and inform the user of the error.

3.  **Legacy Sync Fallback (only when the plan has no `conductor-sync-in-progress` todo):**
    -   Update **Tracks Registry** `- [ ]` → `- [~]`.
    -   Update `conductor/specs/<track_id>/metadata.json`: `status: in_progress`, refresh `updated_at`.
    -   If the plan already includes `conductor-sync-in-progress`, **skip this step** — the task loop owns sync.
    -   After this step, run **Git Isolation** per §3.0 step 4d before the task loop continues.

4.  **Execute Tasks and Update Track Plan:**
    a. **Announce:** One line: executing plan todos per **Workflow** (task index when known).
    b. **Iterate Through Tasks:** Before each task, run `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" plan <plan>` and take `next` — the first todo whose `blocked_by` are all completed (frontmatter order is the tie-break, not the rule). If `parallel_batch` is non-empty, run the **Parallel Dispatch Protocol** in templates/conductor-protocol.md (offer parallel via **User Prompt Protocol**; never assume). If `waiting` lists `unknown_blockers`, announce the misspelled id and ask before continuing. If `next` is null and `blocked` lists todos waiting on something external, report them in one line ("<id> is blocked on <on>") and stop the track here: it stays `[~]`, and status shows the blocker. Track whether **Git Isolation** has run for the **current track** (`git_isolation_done`).
    c. **For Each Task:**
        i. **`conductor-sync-in-progress`:** `conductor_state.py track-status <track_id> in_progress` (registry `[~]`, metadata, real `updated_at`), then `set-todo <plan> conductor-sync-in-progress completed`. Follow **Git Write Policy** for any commit. Then run **Git Isolation** per step d if not yet done.
        ii. **`conductor-sync-complete`:** For decision tracks (`track_role: decision` in metadata), verify no `spike/*` branch exists (`git branch --list 'spike/*'`). If spike branch exists, halt — run `/conductor:conductor-prototype` delete step first. `conductor_state.py track-status <track_id> completed`, then `set-todo <plan> conductor-sync-complete completed`. Commit Conductor files only when **Conductor files** is `committed`. **Then continue to §4.0 and §5.0 in the same turn**: completing the bookend does not end the track, including after a context compaction.
        iii. **All other todos:** Before the first implementation todo, if sync-in-progress is satisfied (registry `[~]`) and **Git Isolation** has not run, execute step d. Then follow the **Workflow** task lifecycle.
           - **CRITICAL:** Human-in-the-loop steps in the **Workflow** use the **User Prompt Protocol**, except hand checks, which are asked in plain chat (protocol rule 8).
           - **Before commit:** Run the **Independent Verification Protocol** for risky todos per the **Workflow** step 6b and **Verifier** in **Working Agreements**; other todos are verified per phase.
           - **On test failure:** Follow the **Systematic Debugging Protocol** in the **Workflow**; persist `attempts` on the todo per **Convergence Budgets**.
           - **On any failure:** Apply the **Failure Policy** row; a failed todo never discards passing sibling work.
    d. **Git Isolation (once per track):** After sync-in-progress is satisfied and **before** any implementation todo or other Git write, follow the **Git Isolation Protocol** in templates/conductor-protocol.md (it applies **Branch** from **Working Agreements** without asking when set). On a resumed `[~]` track whose `metadata.json` records `git.branch`, switch to or stay on that branch instead of asking again. Set `git_isolation_done` after completing. Reset `git_isolation_done = false` when starting a new track via §5.0 continue options. Also run after step 3 legacy sync if the plan has no sync-in-progress todo.

5.  **Legacy Finalize Fallback (only when the plan has no `conductor-sync-complete` todo, and every todo is `completed` or `deferred`):**
    -   Update **Tracks Registry** `[~]` → `[x]` and metadata `completed` if not already done.
    -   Commit Conductor files only when **Conductor files** is `committed` (**Git Write Policy**).
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
        -   **Workflow** (Development Commands and Standing rules only)

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
    c2. **Correct the Workflow:** If a command from **Development Commands** proved wrong or incomplete during this track (a missing flag, a renamed target), or the track added a required step (a generator, a gate), propose the corrected lines as a diff via the **User Prompt Protocol** (header "Workflow") and apply on approval. Plain factual corrections like these are the one doc change that should never wait for a later track.
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

6.  **Final Report:** One line per changed file (max 5). If none changed: "No doc updates needed." If any file changed and **Conductor files** is `committed`, follow **Git Write Policy** before commit (`conductor(docs): Synchronize project docs`).
    - **Example (Product Definition changed):**
        > "Docs synced. **Product Definition** updated for the new feature. **Tech Stack** and **Product Guidelines** unchanged."
    - **Example (no changes):**
        > "Docs synced. No project doc updates needed for this track."

---

## 5.0 TRACK CLEANUP
**PROTOCOL: Offer cleanup and optional continue to the next eligible track in one confirmed choice.**

1.  **Execution Trigger:** This protocol MUST only be executed after the current track has been successfully implemented and the `SYNCHRONIZE PROJECT DOCUMENTATION` step is complete.

2.  **Compute next tracks:** Apply **Eligible Tracks Protocol** in templates/conductor-protocol.md **before** prompting. Record eligible `<track_id>` + description list; note **parallel-ready** (∥) when multiple share lowest `order`.

2b. **Finish the branch** (only when the track ran on a feature branch or worktree, per `metadata.json` `git`, and **Commits** is `agent`). **Step 4 runs it**: inside each handler, after the chosen action (the archive steps, or the review) and before that option's Halt or jump to §5.1, so review fixes land on the branch before it merges and the next track branches from the merged base. Skip it for **Delete**, and for **Skip** unless the user asks:
    1. Run the **Artifact Reference Policy** check over `git diff <base>..HEAD -- . ':!conductor' ':!.gitignore'` and fix any hit first.
    2. Use the **User Prompt Protocol**, header "Branch": **Merge into `<base>`** (fast-forward when possible; Recommended when the repo has no PR workflow), **Open a pull request** (when a remote and `gh` or the host CLI exist), **Leave the branch**.
    3. After a merge or PR, offer the follow-ups in **one** prompt (`multiSelect: true`): **Push `<base>`**, **Push git notes** (`git push origin refs/notes/commits`, so the per-task audit trail reaches the remote), **Delete the track branch**, and **Tag a release** only when the repo already tags releases (suggest the next tag from `git tag --sort=-v:refname`).
    4. None of these are covered by standing approval: each listed command is shown and approved in that prompt (**Git Write Policy**).
    With **Commits** `user`, skip the prompts and list the commands for the user to run.

3.  **Ask for User Choice:** Build options dynamically, then use the **User Prompt Protocol** (do not repeat in chat):

    **Always include:**
    - **Review** — Run `/conductor:conductor-review` before finalizing.
    - **Archive** — Move the spec and plan to `conductor/archive/<track_id>/`; the registry keeps a one-line `(archived)` entry.
    - **Delete** — Permanently delete track folder and registry entry.
    - **Skip** — Leave completed track in tracks file; stop for now.

    **When eligible next tracks exist**, append combined options (user must explicitly choose — never auto-continue):
    - For each eligible track (cap at **2** in this prompt; if more than 2 eligible, include only the two lowest-`order` tracks here):
        - Label: `Skip and continue to <track_id>`, Description: `<track_description>` + `(∥)` when parallel-ready. Leave completed track in registry; start implementing next track.
        - Label: `Archive and continue to <track_id>`, Description: Archive completed track, then implement `<track_description>`.
    - If **>2 eligible** tracks, also add:
        - Label: `Choose next track…`, Description: Pick among all eligible tracks (follow-up **User Prompt Protocol**).

    Put the **recommended** next track (lowest `order`) first among continue options.

    **When no eligible next track exists**, run `conductor_state.py backlog` and, if it has `open` items, append up to 2 options: `Archive and promote <item title>` (archive, then run `/conductor:conductor-new-track backlog:<slug>`).

    **Also offer** `Hand off to a new session` when the session is long (a context compaction happened, or this track had more than ~20 todos): follow `/conductor:conductor-handoff`.

    - **questions:**
        - **header:** "Track Cleanup"
        - **question:** "Track '<track_description>' is complete. What would you like to do?" + if eligible exist: append one line listing eligible ids.
        - **type:** "choice"
        - **multiSelect:** false

4.  **Handle User Response:**

    *   **Review:** Run the `/conductor:conductor-review` protocol now, in this turn, with this track as the confirmed scope (skip its scope prompts). When it finishes, return to this cleanup prompt without the Review option.

    *   **Archive** (standalone): Execute archive steps (4a), commit, finish the branch (2b), announce success. Halt.

    *   **Delete** (standalone): Confirm via the **User Prompt Protocol** `yesno`, then delete steps (4b). Halt unless cancelled.

    *   **Skip** (standalone): Announce completed track remains in tracks file. Halt.

    *   **Skip and continue to `<track_id>`:** Announce leaving completed track in registry. Finish the branch (2b). Go to **§5.1 Continue** with that `<track_id>`.

    *   **Archive and continue to `<track_id>`:** Execute archive steps (4a), commit, announce archived. Finish the branch (2b). Go to **§5.1 Continue** with that `<track_id>`.

    *   **Choose next track…:** use the **User Prompt Protocol** `choice` — one option per eligible track + **Stop for now**. On track pick → if user also wants archive first, use the **User Prompt Protocol** `yesno`: "Archive '<completed_track>' before continuing?" — on yes run 4a, then 2b, then §5.1; on no 2b, then §5.1. On stop → 2b, then halt.

    **4a. Archive steps:** Follow `/conductor:conductor-archive` §3.0–4.0 for this track: run `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" archive <track_id>` (it moves the spec folder **and** the plan into `conductor/archive/<track_id>/` and turns the registry entry into an `(archived)` ledger line that keeps dependents unblocked), handle exit 3 as that skill describes, and commit only when **Conductor files** is `committed`.

    **4b. Delete steps:** (after yes on confirm)
    a. Delete `<Specs Directory>/<track_id>`.
    b. Remove track section from **Tracks Registry**.
    c. Also delete the track's plan file. Commit only when **Conductor files** is `committed` (**Git Write Policy**, message `conductor(track): Delete track '<track_description>'`).

---

## 5.1 CONTINUE TO NEXT TRACK
**PROTOCOL: Jump to the next selected track after explicit user choice in §5.0.**

1.  Resolve `<track_id>` against **Tracks Registry** and metadata. If no longer eligible (race), recompute per **Eligible Tracks Protocol** and use the **User Prompt Protocol** to pick again or halt.

2.  Set `git_isolation_done = false`.

3.  Go to **§3.0 TRACK IMPLEMENTATION** for the selected track.

4.  **Loop:** After §3.0 → §4.0 → §5.0, user may again choose a combined continue option until no eligible tracks remain or they pick a standalone halt option.

