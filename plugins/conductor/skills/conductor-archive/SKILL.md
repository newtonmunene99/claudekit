---
name: conductor-archive
description: Archive completed Conductor tracks by moving their spec and plan into conductor/archive/ and leaving a one-line ledger entry in the tracks registry. Use when the user asks to archive a Conductor track, archive completed tracks, or clean up the tracks registry.
---

Follow `${CLAUDE_PLUGIN_ROOT}/templates/conductor-protocol.md` for file resolution, git policy, and output style.

# Conductor Archive

## Output Style

Follow **Agent Output Style** in `templates/conductor-protocol.md` and `templates/output-style.md`.

**Archive-specific:** Line 1 = what was archived (track ids) or the one question that blocks it. One line per track after that; no file listings unless something failed.

## 1.0 SYSTEM DIRECTIVE

Archiving moves a finished track out of the way without losing it. The script does the moves and the registry edit; you choose the tracks, confirm the risky cases, and commit only when Conductor files are committed.

CRITICAL: Validate the result of every tool call. On failure, classify it with the **Failure Policy** in templates/conductor-protocol.md and apply that row.

## 1.1 SETUP CHECK

1. Resolve the **Tracks Registry** via the **Universal File Resolution Protocol**. If it is missing, announce "Conductor is not set up. Run `/conductor:conductor-setup`." and halt.
2. Read **Working Agreements** per the **Working Agreements Protocol**.

## 2.0 SELECT TRACKS

1. Run `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" tracks` and read `archivable` (completed tracks still under `conductor/specs/`).
2. **Argument given** (`{{args}}`): match each word against `track_id` first, then track descriptions. `all` or `completed` means every id in `archivable`.
3. **No argument:**
   - `archivable` is empty: announce "Nothing to archive: no completed tracks are left in the registry." and halt.
   - Exactly one: archive it without asking; running the command is the request.
   - Several: use the **User Prompt Protocol** (`multiSelect: true`), first option **All completed tracks (Recommended)**.

## 3.0 ARCHIVE

For each selected track:

1. Run `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" archive <track_id>`.
2. **Exit 3 (`needs_confirmation`):**
   - `not_completed`: the track is not `[x]`. Ask once via the **User Prompt Protocol**: "Track '<description>' is not complete. Archive it anyway?" Options: **Keep it** (Recommended), **Archive anyway**.
   - `deferred_checks`: hand checks were postponed (`deferred` lists them). Ask: "'<description>' has unverified checks: <ids>. Archive anyway?" Options: **Run the checks first** (Recommended: list the steps from the plan's **Deferred check** sections), **Archive anyway**.
   - On **Archive anyway**, rerun with `--force`.
3. **Exit 0:** the spec folder and the plan now live in `conductor/archive/<track_id>/`, and the registry entry became `- [x] **Track: …** (archived)` linking to the archived spec. That ledger line keeps later tracks' `depends_on` satisfied; do not delete it.
4. **Other failures:** report the error line and continue with the next track (**Failure Policy → Isolate**).

## 4.0 COMMIT

- **Conductor files `local`:** nothing to commit; say nothing about git.
- **Conductor files `committed`:** follow **Working Agreements** and the **Git Write Policy**, one commit for the batch: `conductor(archive): Archive <n> track(s)`.

## 5.0 ANNOUNCE

One line per archived track, then the next step: the next eligible track from `tracks` (`/conductor:conductor-implement <track_id>`), or `/conductor:conductor-new-track` when none is eligible.
