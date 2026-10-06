# autoname

Names a Claude Code session that was left unnamed, so you don't have to `/rename` and `/color` by hand.

After a main turn of a session with no name, it asks Haiku for a 2–4 word kebab-case slug from the transcript: the folder, your first three prompts and the latest, and Claude's first reply (at most a few hundred tokens). Pasted text keeps its body, since a pasted ticket or report is often the whole topic, and plugin or skill commands like `/engineering:improve-codebase-architecture` count as prompts. Harness rows (built-in commands, image placeholders, subagent reports, skill bodies) are dropped. It waits for a turn with enough text to name from, and a reply that reads like a sentence instead of a name is thrown away, not cut down to four words. Then it runs `/rename <slug>` and `/color <colour>`. The colour is picked from the slug, so the same name always gets the same colour. It runs in the background; the commands queue until the session is idle and show in the transcript like typed ones.

It never renames a session that already has a name (from `/rename`, or a name Claude Code reports at session start or with a prompt), it skips subagent turns, and it tries once per session.

## `/autoname [hint]`

Names the session now, whatever its current name, from more of it: up to ten of your prompts (the first five and the latest five), Claude's first and latest replies, and the files edited. Use it when the automatic name missed or the session has moved on. An optional hint steers it: `/autoname protodb`. It also sets the colour when that option is on, and stops the automatic attempt from running later.

Needs a Claude Code build with mod support (function hooks).

## Options

| Option | Default | What it does |
| :----- | :------ | :----------- |
| `color` | on | Also set the session colour with `/color` |

Set with `/config` or `/plugin configure autoname@claudekit`.
