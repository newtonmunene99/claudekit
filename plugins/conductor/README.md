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
