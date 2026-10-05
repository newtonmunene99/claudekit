# autoname

Names a Claude Code session that was left unnamed, so you don't have to `/rename` and `/color` by hand.

After a main turn of a session with no name, it asks Haiku for a 2–4 word kebab-case slug from the transcript: your first three prompts and the latest, without slash commands or image placeholders (about 300 tokens). It waits for a turn with enough text to name from. Then it runs `/rename <slug>` and `/color <colour>`. The colour is picked from the slug, so the same name always gets the same colour. It runs in the background; the commands queue until the session is idle and show in the transcript like typed ones.

It never renames a session that already has a name (from `/rename`, or a name Claude Code reports at session start or with a prompt), it skips subagent turns, and it tries once per session.

Needs a Claude Code build with mod support (function hooks).

## Options

| Option | Default | What it does |
| :----- | :------ | :----------- |
| `color` | on | Also set the session colour with `/color` |

Set with `/config` or `/plugin configure autoname@claudekit`.
