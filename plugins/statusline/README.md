# statusline

A status line as a mod, the same on every install: no `statusLine` script to set up per machine.

Needs a Claude Code build with mod support (function hooks).

## Above the prompt

A row of pills, wrapping when the window is narrow:

| Pill | Shows |
| :--- | :---- |
| `5h` | 5-hour limit: bar, % used, time to reset |
| `7d` | weekly limit: bar, % used, time to reset |
| `ctx` | context window fill |
| `↑` `↓` `≋` | this session's input, output and cache-read tokens |
| `$` | this session's cost at API prices (what `/cost` shows) |

Bars turn yellow at 70% and red at 90%. A figure with no reading yet is left out. Token totals count every model request of this session's turns and start at 0 when a session is resumed, so they can run below what the cost covers. Another plugin's band (Conductor's track band) stays, under the pills.

## Under the prompt

At the end of the hint line (terminal only): `folder (branch✗) · model · name · id`. ✗ means git has uncommitted changes; a detached HEAD shows the short commit. The session's name shows when it has one (a `/rename` shows from the next prompt), then the first 8 characters of the session id.

Once it works for you, remove `statusLine` from `~/.claude/settings.json`.

## Writing a mod in claudekit

One mod per plugin, in `plugins/<name>/`: `.claude-plugin/plugin.json` (with `"types": "./types/index.d.ts"` when it keeps `$.state`), `hooks/hooks.json` naming `./register.tsx`, the module and its pure helpers in `hooks/`, tests in `tests/`. Run `claude plugin validate plugins/<name>` and `claude plugin test plugins/<name>` before a version bump. A mod that serves one plugin lives inside that plugin (the Conductor HUD lives in conductor).

Two engine rules shape this:

- A plugin hooks each event once without a matcher, so two mods that both react to `turn.complete` or a prompt cannot share a plugin cleanly.
- `$` is never passed into a function imported from another file; helpers that take `$` are top-level function declarations in the module itself.
