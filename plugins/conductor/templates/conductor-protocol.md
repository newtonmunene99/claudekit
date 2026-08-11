# Conductor Protocol

If a user mentions a "plan" or asks about the plan, and they have used Conductor in the current session, they are likely referring to `conductor/context/tracks.md` or a track plan in `conductor/plans/*.plan.md`.

## Universal File Resolution Protocol

**PROTOCOL: How to locate files.**
To find a file (e.g., "**Product Definition**") within a specific context (Project Root or a specific Track):

1.  **Identify Index:** Determine the relevant index file:
    -   **Project Context:** `conductor/context/index.md`
    -   **Track Context:**
        a. Resolve and read the **Tracks Registry** (via Project Context).
        b. Find the entry for the specific `<track_id>`.
        c. Follow the link provided in the registry to locate the track's spec folder. The index file is `conductor/specs/<track_id>/index.md`.
        d. **Fallback:** If the track is not yet registered (e.g., during creation) or the link is broken:
            1. Resolve the **Specs Directory** (`conductor/specs/`).
            2. The index file is `conductor/specs/<track_id>/index.md`.

2.  **Check Index:** Read the index file and look for a link with a matching or semantically similar label.

3.  **Resolve Path:** If a link is found, resolve its path **relative to the directory containing the `index.md` file**.
    -   *Example:* If `conductor/context/index.md` links to `./workflow.md`, the full path is `conductor/context/workflow.md`.

4.  **Fallback:** If the index file is missing or the link is absent, use the **Default Path** keys below.

5.  **Verify:** You MUST verify the resolved file actually exists on the disk.

**Standard Default Paths (Project):**
- **Product Definition**: `conductor/context/product.md`
- **Tech Stack**: `conductor/context/tech-stack.md`
- **Workflow**: `conductor/context/workflow.md`
- **Product Guidelines**: `conductor/context/product-guidelines.md`
- **Tracks Registry**: `conductor/context/tracks.md`
- **Backlog**: `conductor/context/backlog.md`
- **Reviews Directory**: `conductor/reviews/`
- **Review document**: `conductor/reviews/<slug>_YYYYMMDD-review.md`
- **Knowledge Bundle (OKF)**: resolve per **Knowledge Bundle Resolution** below — typically `knowledge/` at repo root or `<pkg>/knowledge/`. Not `conductor/knowledge/` by default.
- **Decision concept**: `<bundle-root>/decisions/<slug>.md` (OKF concept ID: `decisions/<slug>`)
- **Decision evidence**: `<bundle-root>/decisions/evidence/<slug>.md`
- **Specs Directory**: `conductor/specs/`
- **Plans Directory**: `conductor/plans/`
- **Archive Directory**: `conductor/archive/`

**Standard Default Paths (Track):**
- **Specification**: `conductor/specs/<track_id>/spec.md`
- **Implementation Plan**: `conductor/plans/<plan_filename>.plan.md` (linked from Tracks Registry)
- **Metadata**: `conductor/specs/<track_id>/metadata.json`

**Track `metadata.json` optional fields** (programme tracks):

- `programme_id` — slug linking tracks in one remediation programme
- `order` — integer sequence (1, 2, 3; parallel tracks may share order with `∥` in table)
- `depends_on` — array of `track_id` values that must be `[x]` before implement
- `blocks` — array of `track_id` values this track gates
- `track_role` — `implementation` | `decision` | `docs`
- `deliverable` — for decision tracks: OKF concept path within resolved bundle (e.g. `<pkg>/knowledge/decisions/<slug>.md` or `knowledge/decisions/<slug>.md`)

## Eligible Tracks Protocol

**PROTOCOL:** Used by `/conductor:conductor-implement` and `/conductor:conductor-status`.

1. Parse **Tracks Registry** — for each track entry extract status (`[ ]`, `[~]`, `[x]`), description, and `<track_id>` from the spec link (`../specs/<track_id>/spec.md`).
2. Read `conductor/specs/<track_id>/metadata.json` for each incomplete track (`[ ]` or `[~]`). Default `depends_on: []`, `order: null`.
3. **Eligible:** incomplete track where every id in `depends_on` is `[x]` in the registry.
4. **Blocked:** incomplete track where any `depends_on` id is not `[x]`. Record first missing dependency for messaging.
5. **Sort eligible** by `order` ascending (null/`order` missing → treat as `999`), then registry order.
6. **Parallel-ready:** eligible tracks sharing the lowest `order` among eligible tracks (programme table `∥` rows should use the same `order` value).

**Implement selection:** When no track argument is given and multiple tracks are eligible, use the **User Prompt Protocol** with a numbered choice list — do not pick by file order alone. When exactly one eligible track, confirm with yes/no. When user names a blocked track, announce blockers and offer eligible picker.

**Continue after complete:** Never auto-advance without user confirmation. In §5.0 cleanup, add **combined options** when eligible next tracks exist (e.g. `Archive and continue to <track_id>`, `Skip and continue to <track_id>`). On continue, reset per-track git isolation and loop to §3.0.

**True parallelism:** Multiple parallel-ready tracks still run **one at a time** per agent session; use separate worktrees/chats for concurrent work.

## Knowledge Bundle Resolution

**PROTOCOL:** When writing or reading OKF knowledge (project docs, domain docs, decision deliverables):

1. **Discover** existing bundles: `**/knowledge/index.md` in the repo (exclude `.git`).
2. **Match scope** to track spec, review **Scope**, or user-stated module → use `<module>/knowledge/`.
3. **Repo-wide** knowledge → use `knowledge/` at repository root.
4. **Fallback** `conductor/knowledge/` only when no domain applies and user confirms.

Load `templates/knowledge/bundle-placement-guide.md` from the Conductor plugin for scaffold and concept types. Link discovered bundles from `conductor/context/index.md` — knowledge lives **in the repo beside code**, not only under `conductor/`.

## Conductor Plan Format

Implementation plans use Conductor plan frontmatter in `conductor/plans/*.plan.md`:

```yaml
---
name: Track Title
overview: One-paragraph summary
depends_on: [track_id]
blocks: [track_id]
programme_id: remediation_slug
todos:
  - id: conductor-sync-in-progress
    content: "Conductor — Mark track in progress (tracks.md [~], metadata.json in_progress)"
    status: pending
  - id: task-id
    content: "Task description"
    status: pending
    phase: C4
    blocked_by: [prerequisite-task-id]
  - id: conductor-sync-complete
    content: "Conductor — Mark track complete (tracks.md [x], metadata.json completed)"
    status: pending
---
```

Frontmatter `todos` are the source of truth for implement, status, and revert. Append commit SHAs to `content` on completion.

Optional plan-level fields: `depends_on`, `blocks`, `programme_id`. Optional todo-level fields: `phase`, `blocked_by`. Claude Code may ignore unknown fields — they remain for agent protocol and programme review.

**Mandatory sync bookends** — every generated plan MUST include:

- **First todo:** `id: conductor-sync-in-progress` — mark track `[~]` in **Tracks Registry**, set `metadata.json` `status: in_progress`, update `updated_at`.
- **Last todo:** `id: conductor-sync-complete` — mark track `[x]`, set `metadata.json` `status: completed`, update `updated_at`, commit Conductor files.

Do NOT inject feature-branch or worktree todos by default. See **Git Isolation Protocol** below.

For detailed plan authoring rules, resolve `templates/plan-authoring-guide.md` from the installed Conductor plugin (`${CLAUDE_PLUGIN_ROOT}/templates/`).

## User Prompt Protocol

For every gate that requires user input, prefer Claude Code's native **AskUserQuestion** tool — its `header`, `question`, `options` (label + description), and `multiSelect` fields map directly onto the question specs in each skill. When the tool is unavailable, fall back to chat:

1. Present a clear header (e.g. `## Git Workflow`).
2. List numbered options when offering choices.
3. For yes/no gates, ask explicitly: `Proceed? (yes/no)`.
4. **Wait for the user's reply** before continuing. Do not assume defaults unless the protocol explicitly allows it.
5. Do not repeat the same question after the user has answered.

## Git Write Policy

**NEVER** perform Git write operations without user approval.

**Git write operations** include any command that mutates repository state, for example:
- `git add` (staging)
- `git commit`
- `git push`, `git pull` (when it merges or rebases)
- `git checkout` / `git switch` (including branch creation)
- `git merge`, `git rebase`, `git cherry-pick`, `git revert`
- `git stash` (push, pop, apply)
- `git notes add`
- `git reset` (any mode that changes HEAD or the index)

**Read-only operations** (`git status`, `git log`, `git diff`, `git show`, `git branch --list`, `git branch --show-current`) do not require approval.

**Before any Git write operation:**

1. **Explicit request:** If the user's message explicitly authorizes the operation (e.g., "commit these changes", "push to origin", "create a feature branch"), proceed.
2. **Otherwise ask:** Use the **User Prompt Protocol** before executing. State the exact command(s) you intend to run under header `## Git` with question `I need to run: <command(s)>. Proceed? (yes/no)`.
3. **If declined:** Do not run the command. Explain what was skipped and continue the workflow when possible.
4. **Batching:** When multiple write operations belong together (e.g., `git add` then `git commit`), ask once and list all commands.
5. **Prior approval:** If an earlier User Prompt Protocol step in the same Conductor command already authorized the specific Git command(s), do not ask again.

This policy applies to all Conductor commands, skills, and the project **Workflow** template.

## Git Isolation Protocol

When starting track implementation (`/conductor:conductor-implement`) or executing a plan directly in Claude Code, ask the user how to isolate git work **after** `conductor-sync-in-progress` and **before** any other Git write operations or implementation code:

1. If no `.git` directory exists, skip and announce that Git workflows are unavailable.
2. If the user's message **explicitly** requested a workflow (e.g., "implement on a feature branch"), follow that request without asking.
3. Otherwise, use the **User Prompt Protocol** once under header `## Git Workflow`:
   - **Current branch** — Continue on the current branch (default for small/chore tracks)
   - **Feature branch** — Create or switch to a branch (suggest `feature/<track_id>`; confirm name via follow-up if needed)
   - **Git worktree** — Create an isolated worktree (user confirms path/name)
   - **Other** — User describes a custom team workflow
4. Follow **Git Write Policy** for all git commands.
5. Do not add git-isolation todos to plans unless the user explicitly asked during new-track planning.

## Agent Output Style

All Conductor commands and skills MUST shape user-facing messages for action-first reading.

**Conductor-specific formats:** Resolve `templates/output-style.md` from the installed Conductor plugin (`${CLAUDE_PLUGIN_ROOT}/templates/`).

**Every message:**

1. **Lead with the next action** — command, path, or choice on line 1; not context or "I'll..."
2. **Number multi-step work** — one bounded action per step
3. **Restate state each turn** — track name, task N/M, what just completed
4. **Make wins visible** — state what now works in concrete terms
5. **Matter-of-fact errors** — cause + fix; no "Uh oh" or "There seems to be a problem"
6. **Cap lists at 5** — split into "now" vs "later" when longer
7. **End with one next step** — one thing doable in under two minutes (or end cleanly when done)
8. **No preamble or closers** — no "Great question", "Hope this helps", "Let me know if..."

Use the **User Prompt Protocol** for structured prompts. Command-specific output formats live in `templates/output-style.md` and in each skill's output section.
