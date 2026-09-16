# Conductor Plugin

Context-driven development for Claude Code: setup, spec, plan, implement, review, and revert.

**Measure twice, code once.**

## Commands

| Command | Description |
| :------ | :---------- |
| `/conductor:conductor-setup` | One-time project bootstrap |
| `/conductor:conductor-new-track` | Brainstorm, spec, plan (single track or **programme mode**) |
| `/conductor:conductor-implement` | Execute plan todos (`depends_on`, eligible picker, cleanup + continue options) |
| `/conductor:conductor-status` | Progress + eligible / parallel-ready / blocked tracks |
| `/conductor:conductor-revert` | Git-aware revert |
| `/conductor:conductor-review` | Review against guidelines, plan, spec |
| `/conductor:conductor-programme-review` | Review multi-track programme |
| `/conductor:conductor-validate-review` | Validate review findings against repo |
| `/conductor:conductor-prototype` | Decision-track spike on `spike/<slug>` branch |

## Execution model

Conductor runs a track as a small execution graph, not a linear chain:

| Concern | Mechanism | Where |
| ------- | --------- | ----- |
| Plumbing without the model | `scripts/conductor_state.py` (`tracks`, `plan`, `verify-paths`) | Deterministic Plumbing Protocol |
| Real dependencies only | todo `blocked_by` + `files`; implement runs any ready todo | Plan Authoring Guide |
| Parallel work | disjoint-file todos and parallel-ready tracks fan out to subagents, user-confirmed | Parallel Dispatch Protocol |
| Verification on the edge | fresh read-only verifier before each commit and on every plan draft | Independent Verification Protocol |
| Local failures | retry / skip / repair / isolate / escalate / stop table | Failure Policy |
| Bounded loops | `attempts` per todo, `review_rounds` per plan, hard caps | Convergence Budgets |
| Cost | scripts → cheap model → strong model by task | Model Routing |

All protocols live in `templates/conductor-protocol.md`.

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" tracks
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" plan conductor/plans/<file>.plan.md
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" verify-paths <plan-or-review.md> --create-ok
```

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

- **Conductor:** `conductor/context/`, `conductor/specs/`, `conductor/plans/`, `conductor/reviews/`
- **OKF knowledge:** `knowledge/` or `<pkg>/knowledge/` in the repository

## Attribution

Conductor from [gemini-cli-extensions/conductor](https://github.com/gemini-cli-extensions/conductor). OKF from [Google Cloud OKF spec](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md). Engineering skills from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT).

**Output style:** Base rules are defined in `templates/conductor-protocol.md` and `templates/output-style.md`.
