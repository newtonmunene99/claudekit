---
name: conductor-handoff
description: Wrap up a Conductor session and produce a short, paste-ready prompt that starts the next session exactly where this one stopped. Use when the user asks for a handoff, a prompt to continue or pick up in a new session, or wants to pause Conductor work and resume later.
---

Follow `${CLAUDE_PLUGIN_ROOT}/templates/conductor-protocol.md` for file resolution, git policy, and output style.

# Conductor Handoff

## Output Style

Follow **Agent Output Style** in `templates/conductor-protocol.md` and `templates/output-style.md`.

**Handoff-specific:** Line 1 = the prompt is ready (or the one question blocking it). Then the prompt in a fenced block, then one line listing the files updated. Nothing else.

## 1.0 SYSTEM DIRECTIVE

A good handoff needs only a slash command and a few lines, because everything durable already sits where the next session looks: the plan's **Resume** section, notes under a backlog item, and **Standing rules** in **Working Agreements**. Write there first; the prompt only points at it. Hand-written handoff prompts in real use grew to 70 lines, repeated rules every time, and once passed on a wrong "verified" fact that the next session was told not to re-check. This skill exists to stop all three.

CRITICAL: Validate the result of every tool call. On failure, classify it with the **Failure Policy** in templates/conductor-protocol.md and apply that row.

## 1.1 SETUP CHECK

1. Resolve the **Tracks Registry**. If Conductor is not set up, write a plain prompt from the conversation instead and say so in one line.
2. Read **Working Agreements** per the **Working Agreements Protocol**.

## 2.0 RECONCILE STATE

1. Run `conductor_state.py tracks` and, for each in-progress track, `conductor_state.py plan <plan>`.
2. **Plan against git:** on the track's branch (`metadata.json` `git.branch`), list commits after the newest SHA recorded in the plan (`git log --oneline <sha>..HEAD`). For each commit no todo records, match it to a `pending` or `in_progress` todo by its `files` and subject. An unambiguous match: mark the todo `completed` with the SHA now. Anything ambiguous goes under **Unrecorded commits** in the Resume section. A plan that lags git makes the next session redo committed work.
3. **Working tree:** `git status --porcelain`. Uncommitted files go under **State** in the Resume section. Never commit them as part of a handoff.

## 3.0 PERSIST WHAT THE NEXT SESSION NEEDS

1. **In-progress track:** write (or replace) a `## Resume` section at the end of the plan body:
   - **Next:** the next todo id and its first concrete step.
   - **State:** branch, uncommitted files, unrecorded commits, any process left running (e.g. a dev server on :5173).
   - **Decided this session:** decisions not yet in the spec. Also update the spec and the affected pending todos now (Workflow step 7), so this list is only a pointer.
   - **Verified:** facts the next session may trust, each with how it was verified: `read <file:line>`, `ran <command>`, or `captured <testdata path>`.
   - **Unverified:** assumptions still open. Mark them plainly; the next session re-checks these.
   - **Gotchas:** traps hit this session, one line each.
2. **Next work is a backlog item** (no track in progress, or the user named one): append `Notes for next session (YYYY-MM-DD):` under that item in **Backlog**, with the same Verified / Unverified split. Research done this session for items not taken goes under those items too, so it is not lost.
3. **Completed track not archived yet:** offer once to archive it per `/conductor:conductor-archive`; the user may have chosen to keep it in the registry.
4. **Durable rules** the user stated this session and did not record yet: offer once, in one yes/no, to add them to **Standing rules**.
5. **Git notes:** when the repo has a remote and local `refs/notes/commits` is ahead of `git ls-remote origin refs/notes/commits`, offer to push them (`git push origin refs/notes/commits`; always asks under the **Git Write Policy**).

## 4.0 WRITE THE PROMPT

Output one fenced block the user can paste:

1. **Line 1 is the literal slash command**, so the next session loads the right skill even when Claude cannot start skills on its own:
   - in-progress track: `/conductor:conductor-implement <track_id>`
   - next backlog item: `/conductor:conductor-new-track backlog:<slug>` (slug from `conductor_state.py backlog`)
   - unclear: `/conductor:conductor-status`
2. **Then at most 5 lines:** where things stand in one sentence, what to do first, and only what the files cannot carry (a process that may still be running, a pending external event such as an upstream PR).
3. **Do not repeat** Working Agreements, standing rules, spec, or plan content; the next session reads them. Do not call anything verified that was not.
4. If the next session may run on another machine and git notes matter, add: `git fetch origin refs/notes/commits:refs/notes/commits`.

Then one line listing the files updated (plan Resume section, backlog notes, standing rules), and suggest ending this session.
