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


class ArchiveTrack(unittest.TestCase):

  REGISTRY = """
      # Tracks Registry

      ---

      - [x] **Track: Grid view**
        *Spec: [../specs/grid_20260101/spec.md](../specs/grid_20260101/spec.md)*
        *Plan: [../plans/grid_a1b2c3.plan.md](../plans/grid_a1b2c3.plan.md)*

      - [ ] **Track: Toolbar**
        *Spec: [../specs/toolbar_20260102/spec.md](../specs/toolbar_20260102/spec.md)*
        *Plan: [../plans/toolbar_d4e5f6.plan.md](../plans/toolbar_d4e5f6.plan.md)*
      """

  def setUp(self):
    self._tmp = tempfile.TemporaryDirectory()
    self.p = Project(self._tmp.name)
    self.p.write("conductor/context/tracks.md", self.REGISTRY)
    self.p.write("conductor/specs/grid_20260101/spec.md", "# Grid\n")
    self.p.write("conductor/specs/grid_20260101/index.md",
                 "- [Plan](../../plans/grid_a1b2c3.plan.md)\n")
    self.p.write("conductor/plans/grid_a1b2c3.plan.md", """
        ---
        name: Grid
        todos:
          - id: conductor-sync-complete
            status: completed
        ---
        """)
    self.p.write("conductor/specs/toolbar_20260102/metadata.json",
                 '{"depends_on": ["grid_20260101"]}')

  def tearDown(self):
    self._tmp.cleanup()

  def exists(self, rel):
    return os.path.exists(os.path.join(self.p.root, rel))

  def read(self, rel):
    with open(os.path.join(self.p.root, rel), encoding="utf-8") as fh:
      return fh.read()

  def test_moves_spec_and_plan_into_archive(self):
    out, code = self.p.run("archive", "grid_20260101")
    self.assertEqual(code, 0, out)
    self.assertTrue(self.exists("conductor/archive/grid_20260101/spec.md"))
    self.assertTrue(self.exists("conductor/archive/grid_20260101/grid_a1b2c3.plan.md"))
    self.assertFalse(self.exists("conductor/specs/grid_20260101"))
    self.assertFalse(self.exists("conductor/plans/grid_a1b2c3.plan.md"))
    self.assertIn("(./grid_a1b2c3.plan.md)", self.read("conductor/archive/grid_20260101/index.md"))

  def test_leaves_a_ledger_line_that_still_satisfies_dependents(self):
    self.p.run("archive", "grid_20260101")
    registry = self.read("conductor/context/tracks.md")
    self.assertIn("- [x] **Track: Grid view** (archived)", registry)
    self.assertIn("(../archive/grid_20260101/spec.md)", registry)
    self.assertNotIn("../plans/grid_a1b2c3.plan.md", registry)
    out, _ = self.p.run("tracks")
    self.assertEqual(out["recommended"], "toolbar_20260102")

  def test_refuses_an_incomplete_track_without_force(self):
    out, code = self.p.run("archive", "toolbar_20260102")
    self.assertEqual(code, 3)
    self.assertIn("not_completed", out["needs_confirmation"])
    self.assertFalse(self.exists("conductor/archive/toolbar_20260102"))

  def test_tracks_lists_completed_tracks_that_can_be_archived(self):
    out, _ = self.p.run("tracks")
    self.assertEqual(out["archivable"], ["grid_20260101"])


class Backlog(unittest.TestCase):

  def setUp(self):
    self._tmp = tempfile.TemporaryDirectory()
    self.p = Project(self._tmp.name)

  def tearDown(self):
    self._tmp.cleanup()

  def test_checkbox_items_get_slugs_and_status(self):
    self.p.write("conductor/context/backlog.md", """
        # Backlog

        - [x] **Filtering across views** — promoted 2026-09-07 to track `view-filters_20260907`.
        - [ ] **Let the reader widen the conversations column.** Asked for on 2026-09-10.
          `Specialist.svelte` pins the inbox at 300px.
        - [ ] Windows and Linux verification (buildable, untested)
        """)
    out, code = self.p.run("backlog")
    self.assertEqual(code, 0)
    self.assertEqual([i["slug"] for i in out["items"]], [
        "filtering-across-views",
        "let-the-reader-widen-the-conversations-column",
        "windows-and-linux-verification-buildable-untested"])
    self.assertEqual([i["status"] for i in out["items"]], ["done", "open", "open"])
    self.assertEqual(out["open"], 2)

  def test_heading_items_and_parked_markers(self):
    self.p.write("conductor/context/backlog.md", """
        # Backlog

        ## Full live graph view
        Needs per-node events.

        ## PARKED: OAuth tool auth
        Paused spike.
        """)
    out, _ = self.p.run("backlog")
    self.assertEqual([(i["slug"], i["status"]) for i in out["items"]], [
        ("full-live-graph-view", "open"), ("oauth-tool-auth", "parked")])

  def test_headings_are_sections_when_the_file_has_checkbox_items(self):
    self.p.write("conductor/context/backlog.md", """
        # Backlog

        ## Programme: product grid
        - [ ] **Popover sections** — waiting on features.

        ## Decisions (do not re-propose)
        - Keep the BFF out of desk.
        """)
    out, _ = self.p.run("backlog")
    self.assertEqual([(i["slug"], i["section"]) for i in out["items"]],
                     [("popover-sections", "Programme: product grid")])

  def test_decision_headings_are_not_open_work(self):
    self.p.write("conductor/context/backlog.md", """
        ## Subagent attribution
        ## Decisions (do not re-propose)
        """)
    out, _ = self.p.run("backlog")
    self.assertEqual([i["status"] for i in out["items"]], ["open", "decided"])

  def test_reports_duplicated_items(self):
    self.p.write("conductor/context/backlog.md", """
        - [ ] **Render the markdown support actually sends.** First copy.
        - [ ] **Render the markdown support actually sends.** Second copy.
        """)
    out, _ = self.p.run("backlog")
    self.assertEqual(out["duplicates"], ["render-the-markdown-support-actually-sends"])


if __name__ == "__main__":
  unittest.main()
