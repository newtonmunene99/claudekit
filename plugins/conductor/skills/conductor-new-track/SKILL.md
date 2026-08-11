---
name: conductor-new-track
description: Create a new track with brainstorm, spec, and Conductor plan
disable-model-invocation: true
---

Follow `${CLAUDE_PLUGIN_ROOT}/templates/conductor-protocol.md` for file resolution, git policy, and output style.

# Conductor New Track

## Claude Tool Mapping

- **User Prompt Protocol** for structured user prompts (AskUserQuestion tool when available, else numbered options in chat; wait for reply)
- **Read** / **Write** / **Edit** for file operations
- **Bash** for shell commands
- **Grep** / **Glob** for search
- Use relative paths under `conductor/` for all Conductor artifacts

## Output Style

Follow **Agent Output Style** in `templates/conductor-protocol.md` and `templates/output-style.md`.

**New-track-specific:** Line 1 = current phase (brainstorm | spec | plan) and the one thing the user should do. Restate approved design in ≤5 bullets before drafting spec. On completion: "Run `/conductor:conductor-implement` on `<track_id>`."

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


## 1.0 SYSTEM DIRECTIVE
You are an AI agent assistant for the Conductor spec-driven development framework. Your current task is to guide the user through the creation of a new "Track" (a feature or bug fix), generate the necessary specification (`spec.md`) and plan (Conductor plan file) files, and organize them within a dedicated track directory.

CRITICAL: You must validate the success of every tool call. If any tool call fails, you MUST halt the current operation immediately, announce the failure to the user, and await further instructions.


---

## 1.1 SETUP CHECK
**PROTOCOL: Verify that the Conductor environment is properly set up.**

1.  **Verify Core Context:** Using the **Universal File Resolution Protocol**, resolve and verify the existence of:
    -   **Product Definition**
    -   **Tech Stack**
    -   **Workflow**

2.  **Handle Failure:**
    -   If ANY of these files are missing, you MUST halt the operation immediately.
    -   Announce: "Conductor is not set up. Please run `/conductor:conductor-setup` to set up the environment."
    -   Do NOT proceed to New Track Initialization.

---

## 2.0 NEW TRACK INITIALIZATION
**PROTOCOL: Follow this sequence precisely.**

### 2.1 Get Track Description and Determine Type

1.  **Load Project Context:** Read and understand the content of the project documents (**Product Definition**, **Tech Stack**, etc.) resolved via the **Universal File Resolution Protocol**.
2.  **Get Track Description & Enter Plan Mode:**
    *   **If `{{args}}` is empty:**
        1.         2. Ask the user using the **User Prompt Protocol** (do not repeat the question in the chat):
            - **questions:**
                - **header:** "Description"
                - **type:** "text"
                - **question:** "Please provide a brief description of the track (feature, bug fix, chore, etc.) you wish to start."
                - **placeholder:** "e.g., Implement user authentication"
            Await the user's response and use it as the track description.
    *   **If `{{args}}` contains a description:**
        1. Use the content of `{{args}}` as the track description.
        2. **Infer Track Type:** Analyze the description to determine if it is a "Feature" or "Something Else" (e.g., Bug, Chore, Refactor). Do NOT ask the user to classify it.

### 2.1b Programme detection

After loading the track description, check for **programme mode**:

| Signal | Action |
| ------ | ------ |
| User references `conductor/reviews/*.md` | Enter programme mode |
| Paste includes numbered findings (§3.x, ARCH-N, Addendum) | Enter programme mode |
| Description mentions "remediation", "review findings", or lists ≥6 distinct items | Enter programme mode |
| Otherwise | Continue single-track flow (§2.2) |

**Programme mode protocol:**

1. Resolve and read the review document via **Reviews Directory** (Universal File Resolution).
2. Check for validation addendum (`<review-stem>_validation.md`) or validation section. If missing, announce: "Run `/conductor:conductor-validate-review` first" and use the **User Prompt Protocol** — opt out only if user explicitly accepts unvalidated programme.
3. Load `templates/programme-planning-guide.md` from **Plugin Template Path**.
4. Count findings and classify axes (trust, lifecycle, registry, docs, architecture).
5. **Split vs monolith** — **User Prompt Protocol**:
   - **header:** "Programme split"
   - **type:** choice
   - **options:** Split into N tracks (recommended when ≥6 findings or ≥3 axes) | Single monolith track | Custom split (user describes)
6. If ARCH-N findings block future refactors, include a **decision track** (see §2.5b).
7. Optional: suggest `/engineering:improve-codebase-architecture` (engineering plugin) for architecture deepening before split.
8. Skip §2.2–2.4 single-track loops; use **§2.3p Programme specs**, **§2.4p Programme plans**, **§2.4b Programme synthesis**, then **§2.5p Programme artifacts**.

### 2.2 Brainstorm and Design

**HARD-GATE:** Do NOT draft `spec.md`, create a plan, or write implementation code until the user has approved the design for this track.

1.  **State Your Goal:** One line: "Brainstorm: I'll ask about purpose and constraints before writing the spec." (No multi-paragraph intro.)

2.  **Explore Context:** Read **Product Definition**, **Tech Stack**, and relevant codebase areas related to the track description.

3.  **Scope Decomposition:** If the description spans multiple independent subsystems, immediately use the **User Prompt Protocol** to propose splitting into separate tracks before continuing.

#### If FEATURE (full brainstorm flow)

4.  **Clarifying Questions:** Ask **one question per **User Prompt Protocol** call** (do not batch during brainstorm). Focus on purpose, constraints, and success criteria. Prefer multiple-choice when possible.
5.  **Approaches:** Propose **2–3 options** with trade-offs and your recommendation.
6.  **Section-by-Section Design:** Present architecture, data flow, error handling, and testing approach in sections. After each section, use the **User Prompt Protocol** for approval before continuing.
7.  **YAGNI Gate:** Even "simple" tracks get a design — it may be brief, but must be presented and approved.
8.  **Transition:** Summarize the approved design, then proceed to §2.3.

#### If SOMETHING ELSE (Bug, Chore, Refactor — lightweight flow)

Skip multi-approach design. Use **one question per **User Prompt Protocol** call** to cover: reproduction/scope, root-cause hypothesis (bugs), proposed fix approach, success criteria, and out-of-scope. Summarize and get approval via the **User Prompt Protocol**, then proceed to §2.3.

### 2.3 Interactive Specification Generation (`spec.md`)

1.  **State Your Goal:** One line: "Drafting `spec.md` from the approved design."

2.  **Questioning Phase (if gaps remain):** Ask follow-up questions using the **User Prompt Protocol**. You may batch up to 4 related questions in a single tool call. Tailor questions based on the track type (Feature or Other).
    *   **CRITICAL:** Wait for the user's response after each **User Prompt Protocol** tool call.
    *   **General Guidelines:**
        *   Refer to information in **Product Definition**, **Tech Stack**, etc., to ask context-aware questions.
        *   Provide a brief explanation and clear examples for each question.
        *   **Strongly Recommendation:** Whenever possible, present 2-3 plausible options for the user to choose from.

        *   **1. Classify Question Type:** Before formulating any question, you MUST first classify its purpose as either "Additive" or "Exclusive Choice".
            *   Use **Additive** for brainstorming and defining scope (e.g., users, goals, features, project guidelines). These questions allow for multiple answers.
            *   Use **Exclusive Choice** for foundational, singular commitments (e.g., selecting a primary technology, a specific workflow rule). These questions require a single answer.
        
        *   **2. Formulate the Question:** Use the **User Prompt Protocol**: Adhere to the following for each question in the `questions` array:
            - **header:** Very short label (max 16 chars).
            - **type:** "choice", "text", or "yesno".
            - **multiSelect:** (Required for type: "choice") Set to `true` for multi-select (additive) or `false` for single-choice (exclusive).
            - **options:** (Required for type: "choice") Provide 2-4 options, each with a `label` and `description`. Note that "Other" is automatically added.
            - **placeholder:** (For type: "text") Provide a hint.

        *   **3. Interaction Flow:**
            *   Wait for the user's response after each **User Prompt Protocol** tool call.
            *   If the user selects "Other", use a subsequent **User Prompt Protocol** tool call with `type: "text"` to get their input if necessary.
            *   Confirm your understanding by summarizing before moving on to drafting.

    *   **If FEATURE:**
        *   **Ask 3-4 relevant questions** to clarify the feature request using the **User Prompt Protocol**.
        *   Examples include clarifying questions about the feature, how it should be implemented, interactions, inputs/outputs, etc.
        *   Tailor the questions to the specific feature request (e.g., if the user didn't specify the UI, ask about it; if they didn't specify the logic, ask about it).

    *   **If SOMETHING ELSE (Bug, Chore, etc.):**
        *   **Ask 2-3 relevant questions** to obtain necessary details using the **User Prompt Protocol**.
        *   Examples include reproduction steps for bugs, specific scope for chores, or success criteria.
        *   Tailor the questions to the specific request.

3.  **Draft `spec.md`:** Draft the content for the track's `spec.md` file from the approved design, including sections like Overview, Functional Requirements, Non-Functional Requirements (if any), Acceptance Criteria, and Out of Scope.

4.  **Spec Self-Review:** Before user confirmation, review the draft with fresh eyes and fix inline:
    - **Placeholder scan:** No TBD, TODO, incomplete sections, or vague requirements.
    - **Internal consistency:** No contradicting sections; architecture matches feature descriptions.
    - **Scope check:** Focused enough for a single implementation plan, or needs decomposition.
    - **Ambiguity check:** Requirements interpretable only one way; make implicit choices explicit.

5.  **User Confirmation:**
    -   **Ask for Approval:** Use the **User Prompt Protocol** to request confirmation. You MUST embed the drafted content directly into the `question` field so the user can review it in context.
        - **questions:**
            - **header:** "Confirm Spec"
            - **question:**
                Please review the drafted Specification below. Does this accurately capture the requirements?

                ---

                <Insert Drafted spec.md Content Here>
            - **type:** "choice"
            - **multiSelect:** false
            - **options:**
                - Label: "Approve", Description: "The specification looks correct, proceed to planning."
                - Label: "Revise", Description: "I want to make changes to the requirements."
    Await user feedback and revise the `spec.md` content until confirmed.

### 2.4 Interactive Plan Generation (Conductor plan file)

1.  **State Your Goal:** One line: "Drafting the Conductor plan from the approved spec."

2.  **Load Plan Authoring Guide:** Resolve and read `templates/plan-authoring-guide.md` from the **Plugin Template Path**. Follow it for plan quality, mandatory sync todos, and plan body structure.

3.  **Generate Plan:**
    *   Read the confirmed `spec.md` content for this track.
    *   Resolve and read the **Workflow** file (via the **Universal File Resolution Protocol** using the project's index file).
    *   Generate a Conductor plan file at `conductor/plans/<slug>_<shortid>.plan.md` with frontmatter `todos` (see Conductor Plan Format above and **Plan Authoring Guide**).
    *   **CRITICAL:** Each todo must have `id`, `content`, and `status: pending`.
    *   **CRITICAL:** The plan structure MUST adhere to the **Workflow** file (e.g., TDD: separate todos for "Write Tests" and "Implement").
    *   **CRITICAL: Mandatory sync bookends.** First todo MUST be `conductor-sync-in-progress`; last todo MUST be `conductor-sync-complete`. Do NOT inject git-isolation todos unless the user explicitly requested one during planning.
    *   **CRITICAL: Inject Phase Completion Tasks.** If workflow defines "Phase Completion Verification and Checkpointing Protocol", add a todo per phase: `content: "Conductor - User Manual Verification '<Phase Name>' (Protocol in workflow.md)"`.
    *   **CRITICAL: Plan self-review** per the Plan Authoring Guide before user confirmation.
    *   **CRITICAL: Path verification** per the Plan Authoring Guide Path verification checklist. Extract paths from `**Files:**` lines; verify with `test -f` / `Read`; record Path verification subsection; **halt on unresolved paths** before user confirmation.

4.  **User Confirmation:**
    -   **Ask for Approval:** Use the **User Prompt Protocol** to request confirmation. You MUST embed the drafted content directly into the `question` field so the user can review it in context.
        - **questions:**
            - **header:** "Confirm Plan"
            - **question:**
                Please review the drafted Conductor plan file below. Does this look correct and cover all the necessary steps?

                ---

                <Insert Drafted Conductor plan file Content Here>
            - **type:** "choice"
            - **multiSelect:** false
            - **options:**
                - Label: "Approve", Description: "The plan looks solid, proceed to implementation."
                - Label: "Revise", Description: "I want to modify the implementation steps."
    Await user feedback and revise the Conductor plan file content until confirmed.

### 2.3p Programme specification generation

For each track in the approved programme split:

1. Draft `spec.md` from assigned findings (reference review paths and IDs).
2. Decision tracks: use `templates/decision-track-spec.md` as skeleton.
3. Run spec self-review (§2.3 step 4) per track.
4. Batch spec approval via the **User Prompt Protocol** per track OR single programme spec review (user choice).

### 2.4p Programme plan generation

For each approved spec:

1. Load **Plan Authoring Guide** and **Workflow**.
2. Draft plan with sync bookends, path verification, phases when >12 todos.
3. Decision track plans MUST include todos invoking engineering skills:
   - `/engineering:grilling` — stress-test options
   - `/engineering:research` — evidence gathering
   - `/conductor:conductor-prototype` — spike on `spike/<slug>` branch
   - `/engineering:grill-with-docs` — write OKF decision concept at `<bundle-root>/decisions/<slug>.md`
4. Do **not** ask Confirm Plan per track yet — proceed to §2.4b synthesis first.

### 2.4b Programme synthesis pass

**CRITICAL:** Run once all draft plans exist, before any Confirm Plan or Confirm Programme.

1. Load `templates/programme-planning-guide.md`.
2. **Cross-track dedup matrix** — assign single owner per file/function/namespace concern; add **Removed — owned by Track X** stubs to non-owner plans.
3. **Sequencing edges** — set `programme_id`, `order`, `depends_on`, `blocks`, `track_role` on each track metadata draft.
4. **Prerequisite scan** — insert `PREREQUISITE:` todos where tests would be vacuous.
5. **Path verification** — run checklist on every plan; aggregate fix table.
6. **Sequencing table** — draft programme header from `templates/tracks-programme-header.md`.
7. **Confirm Programme** — single **User Prompt Protocol** embedding sequencing table, dedup matrix, path fixes, decision/backlog summary.
8. Revise until approved.

### 2.5b Decision track scaffold (OKF knowledge bundle)

When programme includes a decision track, at artifact write time:

1. **Resolve bundle root** per **Knowledge Bundle Resolution** in templates/conductor-protocol.md (load `templates/knowledge/bundle-placement-guide.md`). Prefer `<pkg>/knowledge/` from review/track scope; else repo-root `knowledge/`.
2. If no bundle exists, scaffold from `templates/knowledge/` at the resolved root (`index.md`, `log.md`, `decisions/index.md`).
3. Link discovered bundle(s) from `conductor/context/index.md` (e.g. `[<pkg> knowledge](../../<pkg>/knowledge/)` — adjust relative path).
4. Set `metadata.json`: `"track_role": "decision"`, `"deliverable": "<bundle-root>/decisions/<slug>.md"`.
5. Add proposed entry to `<bundle-root>/decisions/index.md` and `<bundle-root>/log.md`.
6. Append backlog gating from `templates/backlog-gating-snippet.md`.

Use `templates/knowledge/decision-concept.md` for the OKF deliverable shape (`type: Architecture Decision`).

### 2.5 Create Track Artifacts and Update Main Plan

1.  **Check for existing track name:** Before generating a new Track ID, resolve the **Specs Directory** using the **Universal File Resolution Protocol**. List all existing track directories in that resolved path. Extract the short names from these track IDs (e.g., ``shortname_YYYYMMDD`` -> `shortname`). If the proposed short name for the new track (derived from the initial description) matches an existing short name, halt the `newTrack` creation. Explain that a track with that name already exists and suggest choosing a different name or resuming the existing track.
2.  **Generate Track ID:** Create a unique Track ID (e.g., ``shortname_YYYYMMDD``).
3.  **Create Directory:** Create a new directory for the tracks: `conductor/specs/<track_id>/`.
4.  **Create `metadata.json`:** Create a metadata file at `conductor/specs/<track_id>/metadata.json` with content like:
    ```json
    {
      "track_id": "<track_id>",
      "type": "feature",
      "status": "new",
      "created_at": "YYYY-MM-DDTHH:MM:SSZ",
      "updated_at": "YYYY-MM-DDTHH:MM:SSZ",
      "description": "<Initial user description>",
      "programme_id": "<optional programme slug>",
      "order": 1,
      "depends_on": [],
      "blocks": [],
      "track_role": "implementation",
      "deliverable": null
    }
    ```
    *   Populate fields with actual values. Use the current timestamp. Omit programme fields for single tracks.
5.  **Write Files:**
    *   Write the confirmed specification content to `conductor/specs/<track_id>/spec.md`.
    *   Write the confirmed plan content to `conductor/plans/<slug>_<shortid>.plan.md`.
    *   Write the index file to `conductor/specs/<track_id>/index.md` with content:
        ```markdown
        # Track <track_id> Context

        - [Specification](./spec.md)
        - [Plan](../../plans/<slug>_<shortid>.plan.md)
        - [Metadata](./metadata.json)
        ```


7.  **Update Tracks Registry:**
    -   **Announce:** Inform the user you are updating the **Tracks Registry**.
    -   **Programme:** Insert programme header (§2.4b) once, then append each track with inline order hint: `— _order N; <hint>_`
    -   **Single track:** Append section:
        ```markdown

        ---

        - [ ] **Track: <Track Description>**
          *Spec: [../specs/<track_id>/spec.md](../specs/<track_id>/spec.md)*
          *Plan: [../plans/<slug>_<shortid>.plan.md](../plans/<slug>_<shortid>.plan.md)*
        ```
8.  **Commit Conductor Files:**
    -   Follow the **Git Write Policy** in templates/conductor-protocol.md for all files created or modified in this workflow (spec, plan, index, metadata, **Tracks Registry**, OKF knowledge scaffold, backlog).
    -   Suggested message: `chore(conductor): Add new track '<track_description>'` or `chore(conductor): Add remediation programme '<programme_id>'`.
9.  **Announce Completion:** One line: "Track `<track_id>` ready. Next: run `/conductor:conductor-implement`." For programmes: list track order and first implementable track (lowest `order` with satisfied `depends_on`).

### 2.5p Programme artifacts write loop

After Confirm Programme, for each track in sequence:

1. Run §2.5 steps 1–5 (check name, track ID, directory, metadata with programme fields, write files).
2. Run §2.5b if decision track.
3. Append track entry under programme header in `tracks.md`.
4. Single commit for entire programme preferred (Git Write Policy applies once).


