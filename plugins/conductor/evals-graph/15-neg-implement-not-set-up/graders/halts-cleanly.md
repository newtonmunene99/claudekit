---
type: llm
focus: last_message
---
The working directory has no `conductor/` directory at all. The correct reply is a short halt: it says Conductor is not set up for this project and tells the user to run `/conductor:conductor-setup`. Check each claim:
1. The reply states that Conductor is not set up (or equivalent: not initialised, no conductor directory found).
2. It points the user to `/conductor:conductor-setup`.
3. It does not invent a track or todo, does not ask which track to implement, and does not offer to scaffold the files itself.
4. It is short: the halt line, the pointer to setup, and at most a brief list of the missing context files or a short note about tool availability in this session. It is not a walkthrough of what Conductor is and does not describe the implement protocol.
Pass only if all four hold.
