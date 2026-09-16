---
type: llm
focus: last_message
---
The working directory has no `conductor/` directory at all. The correct reply is a short halt: it says Conductor is not set up for this project and tells the user to run `/conductor:conductor-setup`. Check each claim:
1. The reply states that Conductor is not set up (or equivalent: not initialised, no conductor directory found).
2. It points the user to `/conductor:conductor-setup`.
3. It does not invent any track, task count, or progress figure. A reply that reports "0 of 0 tasks" or a percentage as if it were a real status overview fails. A one-word "Blocked" verdict that explains the environment is missing is acceptable; "On track" or "Behind" is not.
4. It does not offer to scaffold the files itself, and does not claim to have created anything.
5. It is short: a few lines, not a walkthrough of what Conductor is.
Pass only if all five hold.
