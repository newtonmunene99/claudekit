---
max_turns: 24
timeout_seconds: 420
allowed_tools: [Skill, Read, Glob, Grep, Write, Edit]
runs: 3
tags: [validate-review, graph]
---
/conductor:conductor-validate-review conductor/reviews/tinycalc_20260914-review.md

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
```

### `conductor/context/workflow.md`

```
# Workflow

TDD per todo: failing test first, then minimal code, run `python3 -m unittest`. Follow the Systematic Debugging Protocol and Convergence Budgets from the Conductor protocol: 3 failed fix attempts on one todo means stop and ask the user about the approach. Conductor sync todos bookend every plan.
```

### `conductor/reviews/tinycalc_20260914-review.md`

```
# Review: tinycalc

**Scope:** `tinycalc/`
**Date:** 2026-09-14

## Findings

### Critical — C1: parse loses operator precedence
- **File**: `tinycalc/parser.py:12`
- **Context**: `parse` folds left without precedence.

### High — H1: add has no float test
- **File**: `tinycalc/__init__.py:1`
- **Context**: `add` is untested for floats.
```

### `tinycalc/__init__.py`

```
def add(a, b):
    return a + b
```

### `tinycalc/parse.py`

```
def parse(s):
    return s.split()
```


All files above must exist before the validation protocol runs.
