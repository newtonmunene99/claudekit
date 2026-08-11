# Claudekit

**A curated kit of Claude Code plugins for developers who mean business.**

This repository is a [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces). Add it once, then install individual plugins from the marketplace panel.

A Claude Code port of [Conductor](https://github.com/gemini-cli-extensions/conductor), the Gemini CLI extension for context-driven development. Conductor project artifacts live under **`conductor/`**, matching upstream.

## Install

In Claude Code, add this repository as a plugin marketplace:

```text
/plugin marketplace add https://github.com/newtonmunene99/claudekit
```

Then install the plugins you want:

```text
/plugin install conductor@claudekit
/plugin install engineering@claudekit
```

### Local development

```bash
claude --plugin-dir ./plugins/conductor --plugin-dir ./plugins/engineering
```

Inside Claude Code:

```text
/reload-plugins
/conductor:conductor-setup
/plugin details conductor
```

## Available plugins

| Plugin | Description |
| :----- | :---------- |
| [**conductor**](plugins/conductor/) | Context-driven development: setup, spec, plan, implement, review, programmes, decision tracks |
| [**engineering**](plugins/engineering/) | Grilling, research, prototype, architecture review (pairs with Conductor decision tracks) |

See each plugin's README for skills, usage, and artifact layout.

## Conductor skills

| Skill | Invocation |
| :---- | :--------- |
| Setup | `/conductor:conductor-setup` |
| New track | `/conductor:conductor-new-track` |
| Implement | `/conductor:conductor-implement` |
| Status | `/conductor:conductor-status` |
| Revert | `/conductor:conductor-revert` |
| Review | `/conductor:conductor-review` |
| Programme review | `/conductor:conductor-programme-review` |
| Validate review | `/conductor:conductor-validate-review` |
| Prototype | `/conductor:conductor-prototype` |

## Project artifact layout

```text
conductor/
├── context/
│   ├── index.md
│   ├── product.md
│   ├── product-guidelines.md
│   ├── tech-stack.md
│   ├── workflow.md
│   ├── tracks.md
│   ├── backlog.md
│   └── code_styleguides/
├── specs/<track_id>/
├── plans/*.plan.md
├── reviews/
└── archive/
```

Claude Code's own configuration stays in `.claude/`. Conductor state is tool-agnostic under `conductor/`.

## Validate

```sh
node scripts/validate-template.mjs
claude plugin validate ./plugins/conductor --strict
claude plugin validate ./plugins/engineering --strict
```

## Relationship to upstream Conductor

Claudekit is a manual port of [gemini-cli-extensions/conductor](https://github.com/gemini-cli-extensions/conductor) for Claude Code. Upstream changes require manual re-porting; `node scripts/adapt-from-cursorcade.mjs` applies the mechanical rewrites (paths, tool names, command namespacing) after copying updated files into `plugins/` — review the diff afterwards. Key differences from upstream:

- `.claude-plugin/` manifests and marketplace instead of Gemini CLI extension config
- Skills invoked as `/plugin:skill-name` (namespaced)
- User Prompt Protocol (Claude's AskUserQuestion tool) instead of Gemini's `ask_question`
- Restructured artifact layout under `conductor/` (`context/`, `specs/`, `plans/`, `reviews/`, `archive/`)
- Local additions upstream doesn't have: programme mode, decision tracks + `/conductor:conductor-prototype`, review documents as artifacts, OKF knowledge bundles

## Repository layout

```text
claudekit/
├── .claude-plugin/marketplace.json
├── .github/workflows/validate.yml
├── assets/
├── plugins/
│   ├── conductor/
│   └── engineering/
└── scripts/
    ├── validate-template.mjs
    └── adapt-from-cursorcade.mjs
```

## License

Apache License 2.0 — see [LICENSE](LICENSE). Engineering plugin skills are MIT (see plugin README).
