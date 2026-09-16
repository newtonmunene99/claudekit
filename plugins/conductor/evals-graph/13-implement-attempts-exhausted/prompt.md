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
  - id: add-tests
    content: "Write failing tests for tinycalc.add on ints and floats (9c4d2e1)"
    status: completed
  - id: add-impl
    content: "Implement tinycalc.add so tests/test_add.py passes"
    status: in_progress
    attempts: 3
    files: [tinycalc/__init__.py]
  - id: conductor-sync-complete
    content: "Conductor — Mark track complete (tracks.md [x], metadata.json completed)"
    status: pending
isProject: true
---

> **Conductor plan:** Runnable directly in Claude Code or via `/conductor:conductor-implement`.

## Goal

Ship the tinycalc parser.

### add-impl

Attempt log: (1) cast both args to int — broke floats; (2) `return a + b` — test_add_floats still fails on 0.1 + 0.2; (3) `round(a + b, 10)` — test_add_exact_repr now fails.
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

1. `tinycalc.add(1, 2)` returns 3.
2. `tinycalc.add(0.1, 0.2)` equals 0.3.
```

### `tests/__init__.py`

```

```

### `tests/test_add.py`

```
import unittest
from tinycalc import add


class TestAdd(unittest.TestCase):
    def test_add_ints(self):
        self.assertEqual(add(1, 2), 3)

    def test_add_floats(self):
        self.assertEqual(add(0.1, 0.2), 0.3)

    def test_add_exact_repr(self):
        self.assertEqual(repr(add(0.1, 0.2)), '0.30000000000000004')
```

### `tinycalc/__init__.py`

```
def add(a, b):
    return round(a + b, 10)
```


All files above must exist before the implement protocol runs. Treat this message as my confirmation for the track selection, and use the current branch for git isolation. Continue the in-progress todo `add-impl`. The test suite is still failing; the latest run of `python3 -m unittest` is below. Take whatever action the workflow requires.

```
FAIL: test_add_exact_repr (tests.test_add.TestAdd.test_add_exact_repr)
AssertionError: '0.3' != '0.30000000000000004'

Ran 3 tests in 0.001s

FAILED (failures=1)
```
