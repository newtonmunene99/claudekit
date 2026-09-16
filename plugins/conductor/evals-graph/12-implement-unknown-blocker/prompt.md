---
max_turns: 24
timeout_seconds: 420
allowed_tools: [Skill, Read, Glob, Grep, Write, Edit]
runs: 3
tags: [implement, graph]
---
/conductor:conductor-implement tinycalc parser

Setup step first: this directory has no Conductor artifacts yet. Before running the setup check or any other part of the protocol, create every file listed below exactly as shown, at the given path relative to the current directory. Do not add, rename, or reword anything in them. Only once every file exists, continue with the protocol as normal.

### `conductor/context/product-guidelines.md`

```
# Product guidelines

Plain-English errors. No new dependencies.
```

### `conductor/context/product.md`

```
# Product

`tinycalc`: a Python package with a parser and evaluator for arithmetic expressions.
```

### `conductor/context/tech-stack.md`

```
# Tech stack

Python 3.12, unittest (run with `python3 -m unittest`), no third-party dependencies.
```

### `conductor/context/tracks.md`

```
# Project Tracks

---

- [~] **Track: tinycalc parser**
  *Spec: [../specs/tinycalc_20260915/spec.md](../specs/tinycalc_20260915/spec.md)*
  *Plan: [../plans/tinycalc_7a1e.plan.md](../plans/tinycalc_7a1e.plan.md)*
```

### `conductor/context/workflow.md`

```
# Workflow

TDD per todo: failing test first, then minimal code, run `python3 -m unittest`. Follow the Systematic Debugging Protocol and Convergence Budgets from the Conductor protocol: 3 failed fix attempts on one todo means stop and ask the user about the approach. Conductor sync todos bookend every plan.
```

### `conductor/plans/tinycalc_7a1e.plan.md`

```
---
name: tinycalc parser
overview: Parser and evaluator for tinycalc.
todos:
  - id: conductor-sync-in-progress
    content: "Conductor — Mark track in progress (tracks.md [~], metadata.json in_progress)"
    status: completed
  - id: tokenizer-seam
    content: "PREREQUISITE: expose tinycalc.tokenize so parser tests are not vacuous (a1b2c3d)"
    status: completed
  - id: parser-tests
    content: "Write failing tests for tinycalc.parse on sums and products"
    status: pending
    blocked_by: [tokenizer-seem]
    files: [tests/test_parse.py]
  - id: conductor-sync-complete
    content: "Conductor — Mark track complete (tracks.md [x], metadata.json completed)"
    status: pending
isProject: true
---

> **Conductor plan:** Runnable directly in Claude Code or via `/conductor:conductor-implement`.

## Goal

Ship the tinycalc parser.
```

### `conductor/specs/tinycalc_20260915/metadata.json`

```
{
  "track_id": "tinycalc_20260915",
  "type": "feature",
  "status": "in_progress",
  "created_at": "2026-09-15T09:00:00Z",
  "updated_at": "2026-09-15T09:30:00Z",
  "depends_on": [],
  "blocks": [],
  "track_role": "implementation"
}
```

### `conductor/specs/tinycalc_20260915/spec.md`

```
# Spec: tinycalc parser

## Acceptance criteria

1. `tinycalc.parse("1 + 2")` returns a tree.
2. `tinycalc.tokenize("1 + 2")` returns `["1", "+", "2"]`.
```

### `tinycalc/__init__.py`

```
def add(a, b):
    return a + b


def tokenize(s):
    return s.split()
```


All files above must exist before the implement protocol runs. Treat this message as my confirmation for the track selection and for every yes/no gate, and use the current branch for git isolation. Do not write code, run tests, or commit: stop as soon as you have announced which todo you are starting and why, or what decision you need from me.
