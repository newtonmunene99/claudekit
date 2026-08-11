---
name: conductor-programme-review
description: Review a multi-track remediation programme before implementation
disable-model-invocation: true
---

Follow `${CLAUDE_PLUGIN_ROOT}/templates/conductor-protocol.md` for file resolution, git policy, and output style.

# Conductor Programme Review

Review a multi-track remediation programme before implementation.

Usage: `/conductor:conductor-programme-review` or `/conductor:conductor-programme-review $ARGUMENTS` (optional `programme_id`)

Runs programme review mode in `skills/conductor-review/SKILL.md` §2.1b using `templates/programme-review-checklist.md`.

## Claude Tool Mapping

- **User Prompt Protocol** for structured user prompts (AskUserQuestion tool when available, else numbered options in chat; wait for reply)
- **Read** / **Write** / **Edit** for file operations
- **Bash** for shell commands
- **Grep** / **Glob** for search
- Use relative paths under `conductor/` for all Conductor artifacts

## Output Style

Follow **Agent Output Style** in `templates/conductor-protocol.md` and `templates/output-style.md`. Line 1 = programme verdict or scope confirmation.

## Plugin Template Path

Locate plugin templates in this order:
1. `${CLAUDE_PLUGIN_ROOT}/templates/`
2. Fallback (local dev): `./plugins/conductor/templates/` from claudekit repo root

Follow `skills/conductor-review/SKILL.md` §2.1b and `templates/programme-review-checklist.md` precisely.
