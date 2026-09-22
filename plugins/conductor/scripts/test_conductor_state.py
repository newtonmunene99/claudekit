#!/usr/bin/env python3
"""Tests for conductor_state.py. Run: python3 -m unittest discover plugins/conductor/scripts

Each test builds a throwaway conductor/ tree and runs the real script from its
root, the same way the skills do.
"""

import json
import os
import subprocess
import sys
import tempfile
import textwrap
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "conductor_state.py")


class Project:
  def __init__(self, root):
    self.root = root

  def write(self, rel, content):
    path = os.path.join(self.root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
      fh.write(textwrap.dedent(content).lstrip())

  def run(self, *args):
    proc = subprocess.run([sys.executable, SCRIPT, *args], cwd=self.root,
                          capture_output=True, text=True, check=False)
    return json.loads(proc.stdout), proc.returncode


class TracksDependsOnArchived(unittest.TestCase):

  def setUp(self):
    self._tmp = tempfile.TemporaryDirectory()
    self.p = Project(self._tmp.name)
    self.p.write("conductor/specs/b_20260101/metadata.json",
                 '{"track_id": "b_20260101", "depends_on": ["a_20260101"]}')
    self.p.write("conductor/archive/a_20260101/spec.md", "# A\n")

  def tearDown(self):
    self._tmp.cleanup()

  def test_dependency_archived_and_removed_from_registry_is_satisfied(self):
    self.p.write("conductor/context/tracks.md", """
        # Tracks Registry

        ---

        - [ ] **Track: B**
          *Link: [./conductor/specs/b_20260101/](../specs/b_20260101/spec.md)*
        """)
    out, code = self.p.run("tracks")
    self.assertEqual(code, 0)
    self.assertEqual(out["blocked"], [])
    self.assertEqual(out["recommended"], "b_20260101")

  def test_archived_ledger_line_keeps_its_track_id(self):
    self.p.write("conductor/context/tracks.md", """
        # Tracks Registry

        ---

        - [x] **Track: A** (archived)
          *Link: [./conductor/archive/a_20260101/](../archive/a_20260101/spec.md)*

        - [ ] **Track: B**
          *Link: [./conductor/specs/b_20260101/](../specs/b_20260101/spec.md)*
        """)
    out, code = self.p.run("tracks")
    self.assertEqual(code, 0)
    self.assertEqual(out["tracks"][0]["track_id"], "a_20260101")
    self.assertEqual(out["blocked"], [])


class PlanDeferredVerification(unittest.TestCase):

  def setUp(self):
    self._tmp = tempfile.TemporaryDirectory()
    self.p = Project(self._tmp.name)

  def tearDown(self):
    self._tmp.cleanup()

  def test_deferred_check_blocks_nothing_and_is_reported(self):
    self.p.write("conductor/plans/t_abc123.plan.md", """
        ---
        name: T
        todos:
          - id: conductor-sync-in-progress
            status: completed
          - id: build-grid
            status: completed
            phase: P1
          - id: verify-p1
            status: deferred
            phase: P1
          - id: build-toolbar
            status: pending
            phase: P2
            blocked_by: [verify-p1]
          - id: conductor-sync-complete
            status: pending
        ---
        """)
    out, code = self.p.run("plan", "conductor/plans/t_abc123.plan.md")
    self.assertEqual(code, 0)
    self.assertEqual(out["next"]["id"], "build-toolbar")
    self.assertEqual(out["counts"]["deferred"], 1)
    self.assertEqual(out["deferred"], ["verify-p1"])


if __name__ == "__main__":
  unittest.main()
