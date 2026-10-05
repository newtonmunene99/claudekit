# Conductor Plugin

Context-driven development for Claude Code: setup, spec, plan, implement, review, archive, handoff, and revert.

**Measure twice, code once.**

## Commands

| Command | Description |
| :------ | :---------- |
| `/conductor:conductor-setup` | Project bootstrap; on an existing project, upgrades it to current conventions |
| `/conductor:conductor-new-track` | Brainstorm, spec, plan (single track or **programme mode**) |
| `/conductor:conductor-implement` | Execute plan todos (`depends_on`, eligible picker, cleanup + continue options) |
| `/conductor:conductor-status` | Progress, eligible / blocked tracks, deferred checks, unmerged branches, out-of-date files |
| `/conductor:conductor-archive` | Move finished tracks' spec and plan to `conductor/archive/`, keeping a ledger line |
| `/conductor:conductor-handoff` | Save session state into the plan or backlog and print a short prompt for the next session |
| `/conductor:conductor-revert` | Git-aware revert (the only skill Claude will not start by itself) |
| `/conductor:conductor-review` | Review against guidelines, plan, spec |
| `/conductor:conductor-programme-review` | Review multi-track programme |
| `/conductor:conductor-validate-review` | Validate review findings against repo |
| `/conductor:conductor-prototype` | Decision-track spike on `spike/<slug>` branch |

## Execution model

Conductor runs a track as a small execution graph, not a linear chain:

| Concern | Mechanism | Where |
| ------- | --------- | ----- |
| Standing answers | **Working Agreements** in the project's `workflow.md`: Conductor files local or committed, who commits, branch, autonomy, hand checks, verifier | Working Agreements Protocol |
| Plumbing without the model | `scripts/conductor_state.py`: reads (`tracks`, `plan`, `backlog`, `verify-paths`, `doctor`) and state writes (`set-todo`, `track-status`, `archive`) | Deterministic Plumbing Protocol |
| Real dependencies only | todo `blocked_by` + `files`; implement runs any ready todo | Plan Authoring Guide |
| Parallel work | disjoint-file todos and parallel-ready tracks fan out to subagents, user-confirmed | Parallel Dispatch Protocol |
| Verification on the edge | fresh read-only verifier per phase (the whole track on the last one), per todo for risky changes, and on every plan draft | Independent Verification Protocol |
| Tests that can fail | Google Testing on the Toilet rules, contract probes, no tautological tests | `templates/test-quality.md` |
| Local failures | retry / skip / repair / isolate / escalate / stop table | Failure Policy |
| Bounded loops | `attempts` per todo, `review_rounds` per plan, hard caps | Convergence Budgets |
| Cost | scripts → cheap model → strong model by task | Model Routing |

All protocols live in `templates/conductor-protocol.md`.

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" tracks
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" plan conductor/plans/<file>.plan.md
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" verify-paths <plan-or-review.md> --create-ok
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" backlog
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" set-todo <plan> <todo_id> completed --sha <sha>
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" track-status <track_id> in_progress
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" archive <track_id>
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" doctor [--fix] [--stamp]
```

## HUD (mods)

On Claude Code builds with function hooks, the plugin also loads `hooks/register.tsx`, a mod that keeps the active track on screen. Everything it shows comes from `conductor_state.py`; it never parses plans itself, and it shows nothing in a repo without `conductor/context/tracks.md`.

| Piece | What it does |
| :---- | :----------- |
| Status line | `<track> 7/12` while the band is hidden, or the next eligible track when none is in progress |
| Band above the prompt | Track, progress bar, blocked and deferred counts, the next todo; **Board** (`b`) and **Hide** buttons |
| `/conductor-board` | Pane with next todo, parallel batch, waiting and blocked todos, deferred checks, other tracks, and buttons that fill in `/conductor:conductor-implement`, `review`, `archive` or `status` |
| Toasts | Phase done, a todo newly blocked, review hitting its 2-round limit, track complete |
| Upgrade nudge | At session start, a toast when `doctor` finds drift worth `/conductor:conductor-setup` |
| Status guard | Denies Edit/Write/`sed -i`/redirects that change a todo's `status` in `conductor/plans/` or rewrite `tracks.md`, pointing at `set-todo`. New pending todos and other plan fields pass. It matches spellings, so it is a guardrail, not a boundary; it stays off when `python3` cannot run the script |

It refreshes after each Edit, Write or Bash call and at the end of every turn, re-running the script only when `tracks.md` or the followed plan changed. Develop it with `claude plugin validate plugins/conductor` and `claude plugin test plugins/conductor`.

## Upgrading an existing project

Run `/conductor:conductor-setup` again. On a project that is already set up it runs `doctor`, applies the mechanical repairs (plans stranded by old archives, duplicated backlog items, contradictory `.gitignore` advice), adds **Working Agreements**, refreshes stale workflow sections while keeping project-specific lines, and stamps the version in `conductor/context/index.md`. `/conductor:conductor-status` says when a project is out of date.

## Evals

Two `claude plugin eval` suites, kept separate so each runs, costs, and reports on its own:

| Suite | Dir | Covers |
| ----- | --- | ------ |
| status | `evals/` (default) | `/conductor:conductor-status` outcomes: counts, eligible / blocked / parallel-ready, legacy format, not-set-up, negative |
| graph | `evals-graph/` | implement picks the first *ready* todo (`blocked_by`), offers parallel dispatch, reports typo'd blockers, escalates at `attempts: 3`; validate-review flags wrong paths; implement not-set-up |

```bash
claude plugin eval ./plugins/conductor --allow-tools Write
claude plugin eval ./plugins/conductor --eval-dir evals-graph --allow-tools Write Edit
```

Both suites grade outcomes (last message and files), not tool trajectories: a slash-expanded skill never shows up as a `Skill` tool call. No case grants Bash, so `conductor_state.py` is not exercised by the evals; the skills' documented manual fallbacks are. `results/` dirs are gitignored.

The script has its own unit tests, which run each subcommand against a throwaway `conductor/` tree:

```bash
python3 -m unittest discover plugins/conductor/scripts
```

## Programme mode

From `conductor/reviews/*.md` → validate → split tracks → synthesis → implement in order (continue via explicit cleanup choices when unblocked).

Reference: `docs/examples/remediation-programme-example.md`

## Decision tracks

Deliverable is an **OKF concept** in a **repo knowledge bundle**:

| Scope | Bundle root | Example deliverable |
| ----- | ----------- | ------------------- |
| Domain package | `<pkg>/knowledge/` | `<pkg>/knowledge/decisions/<slug>.md` |
| Repository | `knowledge/` | `knowledge/decisions/<slug>.md` |

Workflow: `/engineering:grilling` → `/engineering:research` → `/conductor:conductor-prototype` → `/engineering:grill-with-docs`

See [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

## Project docs / knowledge requests

1. Discover existing `**/knowledge/index.md` bundles
2. Prefer repo-root `knowledge/` or domain `<pkg>/knowledge/` beside code
3. Scaffold from `templates/knowledge/bundle-placement-guide.md`

## Artifacts

- **Conductor:** `conductor/context/`, `conductor/specs/`, `conductor/plans/`, `conductor/reviews/`, `conductor/archive/`. Commit them, or keep `conductor/` gitignored; setup records the choice in **Working Agreements** and every command follows it.
- **OKF knowledge:** `knowledge/` or `<pkg>/knowledge/` in the repository

## Attribution

Conductor from [gemini-cli-extensions/conductor](https://github.com/gemini-cli-extensions/conductor). OKF from [Google Cloud OKF spec](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md). Engineering skills from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT).

**Output style:** Base rules are defined in `templates/conductor-protocol.md` and `templates/output-style.md`.
