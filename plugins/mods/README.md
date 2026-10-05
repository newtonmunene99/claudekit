# mods

General-purpose Claude Code mods for claudekit. A mod that serves one plugin lives in that plugin (the Conductor HUD lives in conductor); this plugin holds the rest.

Needs a Claude Code build with mod support (function hooks).

## Usage band

A row of pills above the prompt, wrapping when the window is narrow:

| Pill | Shows |
| :--- | :---- |
| `5h` | 5-hour limit: bar, % used, time to reset |
| `7d` | weekly limit: bar, % used, time to reset |
| `ctx` | context window fill |
| `↑` `↓` `≋` | this session's input, output and cache-read tokens |
| `$` | this session's cost at API prices (what `/cost` shows) |

Bars turn yellow at 70% and red at 90%. A figure with no reading yet is left out. Token totals start at 0 when a session is resumed.

Under the prompt, at the end of the hint line (terminal only): `folder (branch✗) · model · name · id`, with ✗ when git has uncommitted changes, the session's name when it has one (a `/rename` shows from the next prompt), and the first 8 characters of the session id.

It replaces a hand-written `statusLine`: once it works for you, remove `statusLine` from `~/.claude/settings.json`.

## Switches

Each feature has a switch in `/config` (or `pluginConfigs.mods` in settings):

| Option | Default | Feature |
| :----- | :------ | :------ |
| `usage` | on | the usage band and hint line |

## Adding a feature

1. Create `features/<name>/register.tsx` exporting `register<Name>(on)`, with pure helpers beside it.
2. Add a boolean `<name>` to `userConfig` in `.claude-plugin/plugin.json`, default `true`.
3. Call it from `hooks/register.tsx` behind `options.<name> !== false`.
4. Prefix its `$.state` keys with `<name>` in `types/index.d.ts`.
5. Add tests under `tests/`, then run `claude plugin validate plugins/mods` and `claude plugin test plugins/mods` before bumping the version.

A feature that fails to load takes the whole module down; a hook that fails at run time only skips itself.
