#!/usr/bin/env python3
"""Tests for conductor_state.py. Run: python3 -m unittest discover plugins/conductor/scripts

Each test builds a throwaway conductor/ tree and runs the real script from its
root, the same way the skills do.
"""

import datetime
import json
import os
import subprocess
import sys
import tempfile
import textwrap
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "conductor_state.py")
RESUME = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "skills", "conductor-setup", "scripts", "resume.py")


class Project:
  def __init__(self, root):
    self.root = root

  def write(self, rel, content):
    path = os.path.join(self.root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
      fh.write(textwrap.dedent(content).lstrip())

  def run(self, *args, script=SCRIPT):
    proc = subprocess.run([sys.executable, script, *args], cwd=self.root,
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
    self.assertEqual(out["deferred"], [{"id": "verify-p1", "phase": "P1"}])


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


class PlanPhases(unittest.TestCase):

  def setUp(self):
    self._tmp = tempfile.TemporaryDirectory()
    self.p = Project(self._tmp.name)
    self.p.write("conductor/plans/g_abc.plan.md", """
        ---
        name: G
        todos:
          - id: build-rows
            status: blocked
            blocked_on: "upstream PR"
            phase: P1
          - id: build-sort
            status: pending
            phase: P1
          - id: verify-p1
            status: pending
            phase: P1
          - id: build-toolbar
            status: pending
            phase: P2
        ---

        - **Goal:** grid
        - **Architecture:** svelte

        ## Phases
        - **P1 rows** — rows
        - **P2 toolbar** — toolbar
        """)

  def tearDown(self):
    self._tmp.cleanup()

  def test_phases_come_from_todos_not_every_bold_bullet(self):
    out, _ = self.p.run("plan", "conductor/plans/g_abc.plan.md")
    self.assertEqual(out["phases"], ["P1", "P2"])

  def test_a_verify_todo_waits_for_the_rest_of_its_phase(self):
    out, _ = self.p.run("plan", "conductor/plans/g_abc.plan.md")
    self.assertEqual(out["next"]["id"], "build-sort")
    waiting = {w["id"]: w["blocked_by"] for w in out["waiting"]}
    self.assertEqual(waiting["verify-p1"], ["build-rows", "build-sort"])


  def test_a_verify_todo_does_not_wait_on_the_closing_bookend(self):
    self.p.write("conductor/plans/h_abc.plan.md", """
        ---
        name: H
        todos:
          - id: build-rows
            status: completed
            phase: P1
          - id: verify-p1
            status: pending
            phase: P1
          - id: conductor-sync-complete
            status: pending
            phase: P1
        ---
        """)
    out, _ = self.p.run("plan", "conductor/plans/h_abc.plan.md")
    self.assertEqual(out["next"]["id"], "verify-p1")


class TracksGit(unittest.TestCase):

  def test_tracks_carry_the_recorded_git_branch(self):
    with tempfile.TemporaryDirectory() as root:
      p = Project(root)
      p.write("conductor/context/tracks.md", """
          - [x] **Track: Grid**
            *Spec: [../specs/grid_20260101/spec.md](../specs/grid_20260101/spec.md)*
          """)
      p.write("conductor/specs/grid_20260101/metadata.json",
              '{"git": {"branch": "feature/grid_20260101", "base": "main"}}')
      out, _ = p.run("tracks")
    self.assertEqual(out["tracks"][0]["git"], {"branch": "feature/grid_20260101", "base": "main"})


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

  def test_a_decided_item_is_not_reported_as_done(self):
    self.p.write("conductor/context/backlog.md", """
        - [x] **Live graph view** — decided 2026-09-08: not building; reopen if upstream ships events.
        """)
    out, _ = self.p.run("backlog")
    self.assertEqual(out["items"][0]["status"], "decided")

  def test_reports_duplicated_items(self):
    self.p.write("conductor/context/backlog.md", """
        - [ ] **Render the markdown support actually sends.** First copy.
        - [ ] **Render the markdown support actually sends.** Second copy.
        """)
    out, _ = self.p.run("backlog")
    self.assertEqual(out["duplicates"], ["render-the-markdown-support-actually-sends"])


class WriteSubcommands(unittest.TestCase):

  PLAN = "conductor/plans/grid_a1b2c3.plan.md"

  def setUp(self):
    self._tmp = tempfile.TemporaryDirectory()
    self.p = Project(self._tmp.name)
    self.p.write(self.PLAN, """
        ---
        name: Grid
        todos:
          - id: grid-rows
            content: "Render one row per product"
            status: in_progress
            files: [src/Grid.svelte]
          - id: grid-sort
            content: "Sort rows by name"
            status: pending
        ---

        # Grid
        """)
    self.p.write("conductor/context/tracks.md", """
        - [ ] **Track: Grid view**
          *Spec: [../specs/grid_20260101/spec.md](../specs/grid_20260101/spec.md)*
        """)
    self.p.write("conductor/specs/grid_20260101/metadata.json",
                 '{"track_id": "grid_20260101", "status": "new", "order": 2}')

  def tearDown(self):
    self._tmp.cleanup()

  def read(self, rel):
    with open(os.path.join(self.p.root, rel), encoding="utf-8") as fh:
      return fh.read()

  def test_set_todo_records_status_and_sha_without_touching_other_todos(self):
    out, code = self.p.run("set-todo", self.PLAN, "grid-rows", "completed", "--sha", "4f9c2e1")
    self.assertEqual(code, 0, out)
    plan = self.read(self.PLAN)
    self.assertIn('content: "Render one row per product (4f9c2e1)"', plan)
    self.assertIn("status: completed", plan)
    self.assertIn('content: "Sort rows by name"\n    status: pending', plan)
    self.assertTrue(plan.rstrip().endswith("# Grid"))

  def test_set_todo_blocked_records_the_reason_and_plan_skips_it(self):
    self.p.run("set-todo", self.PLAN, "grid-sort", "blocked", "--on", "upstream PR adk-go#812")
    self.p.run("set-todo", self.PLAN, "grid-rows", "completed")
    out, _ = self.p.run("plan", self.PLAN)
    self.assertIsNone(out["next"])
    self.assertEqual(out["blocked"], [{"id": "grid-sort", "on": "upstream PR adk-go#812", "phase": None}])

  def test_set_todo_handles_block_lists_before_status(self):
    self.p.write(self.PLAN, """
        ---
        name: Grid
        todos:
          - id: grid-rows
            files:
              - src/Grid.svelte
              - src/Grid.test.ts
            status: pending
        ---
        """)
    self.p.run("set-todo", self.PLAN, "grid-rows", "in_progress")
    plan = self.read(self.PLAN)
    self.assertEqual(plan.count("status:"), 1)
    self.assertIn("status: in_progress", plan)

  def test_set_todo_blocked_requires_a_reason(self):
    out, code = self.p.run("set-todo", self.PLAN, "grid-sort", "blocked")
    self.assertEqual(code, 1)
    self.assertIn("--on", out["error"])

  def test_set_todo_sha_replaces_an_uncommitted_marker_and_sets_attempts(self):
    self.p.run("set-todo", self.PLAN, "grid-rows", "completed", "--sha", "uncommitted")
    self.p.run("set-todo", self.PLAN, "grid-rows", "completed", "--sha", "4f9c2e1", "--attempts", "0")
    plan = self.read(self.PLAN)
    self.assertIn('content: "Render one row per product (4f9c2e1)"', plan)
    self.assertNotIn("uncommitted", plan)
    self.assertIn("attempts: 0", plan)

  def test_set_todo_rejects_an_unknown_todo(self):
    out, code = self.p.run("set-todo", self.PLAN, "grid-typo", "completed")
    self.assertEqual(code, 1)
    self.assertIn("grid-typo", out["error"])

  def test_track_status_updates_registry_and_metadata_with_a_real_timestamp(self):
    before = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    out, code = self.p.run("track-status", "grid_20260101", "in_progress")
    self.assertEqual(code, 0, out)
    self.assertIn("- [~] **Track: Grid view**", self.read("conductor/context/tracks.md"))
    meta = json.loads(self.read("conductor/specs/grid_20260101/metadata.json"))
    self.assertEqual(meta["status"], "in_progress")
    self.assertEqual(meta["order"], 2)
    stamp = datetime.datetime.strptime(meta["updated_at"], "%Y-%m-%dT%H:%M:%SZ").replace(
        tzinfo=datetime.timezone.utc)
    self.assertGreaterEqual(stamp, before)


class Doctor(unittest.TestCase):

  def setUp(self):
    self._tmp = tempfile.TemporaryDirectory()
    self.p = Project(self._tmp.name)
    # A project set up on an early plugin version.
    self.p.write("conductor/context/index.md", "# Project Context\n")
    self.p.write("conductor/context/workflow.md", """
        # Project Workflow

        ### Phase Completion Verification and Checkpointing Protocol
        6.  **Create Checkpoint Commit:** Suggested message: `conductor(checkpoint): Checkpoint end of Phase X`.

        ## Development Commands
        **AI AGENT INSTRUCTION: This section should be adapted to the project's specific language, framework, and build tools.**
        """)
    self.p.write("conductor/context/tracks.md", "# Tracks\n")
    self.p.write("conductor/archive/grid_20260101/index.md",
                 "- [Plan](../../plans/grid_a1b2c3.plan.md)\n")
    self.p.write("conductor/plans/grid_a1b2c3.plan.md", "---\nname: Grid\n---\n")
    self.p.write("conductor/context/backlog.md", """
        - [ ] **Render markdown** — same text.
        - [ ] **Widen the column** — kept.
        - [ ] **Render markdown** — same text.
        - [ ] **Widen the column** — different wording, so a person decides.
        """)
    self.p.write(".gitignore", "conductor/\n# Conductor artifacts under conductor/ are meant to be committed — do not ignore them.\n")

  def tearDown(self):
    self._tmp.cleanup()

  def ids(self, out):
    return sorted(i["id"] for i in out["issues"])

  def read(self, rel):
    with open(os.path.join(self.p.root, rel), encoding="utf-8") as fh:
      return fh.read()

  def test_reports_drift_from_older_conventions(self):
    out, code = self.p.run("doctor")
    self.assertEqual(code, 0)
    self.assertFalse(out["clean"])
    self.assertEqual(self.ids(out), [
        "backlog_duplicates", "gitignore_contradiction", "no_agent_skills",
        "no_working_agreements", "orphaned_plans", "stale_workflow_sections",
        "unadapted_workflow", "unstamped_version"])

  def test_fix_applies_only_mechanical_repairs(self):
    out, code = self.p.run("doctor", "--fix")
    self.assertEqual(code, 0, out)
    self.assertTrue(os.path.exists(os.path.join(
        self.p.root, "conductor/archive/grid_20260101/grid_a1b2c3.plan.md")))
    self.assertIn("(./grid_a1b2c3.plan.md)", self.read("conductor/archive/grid_20260101/index.md"))
    backlog = self.read("conductor/context/backlog.md")
    self.assertEqual(backlog.count("Render markdown"), 1)
    self.assertEqual(backlog.count("Widen the column"), 2)
    self.assertNotIn("do not ignore", self.read(".gitignore"))
    self.assertEqual(self.ids(out), [
        "backlog_duplicates", "no_agent_skills", "no_working_agreements",
        "stale_workflow_sections", "unadapted_workflow", "unstamped_version"])

  def test_stamp_records_the_plugin_version(self):
    out, _ = self.p.run("doctor", "--stamp")
    self.assertIn(f"<!-- conductor: {out['plugin_version']} -->", self.read("conductor/context/index.md"))
    self.assertNotIn("unstamped_version", self.ids(out))


class SetupResume(unittest.TestCase):

  def test_an_initialized_project_routes_to_the_upgrade_section(self):
    with tempfile.TemporaryDirectory() as root:
      p = Project(root)
      p.write("conductor/context/index.md", "# Project Context\n")
      p.write("conductor/context/tracks.md", "# Tracks\n\n- [ ] **Track: Grid**\n")
      out, code = p.run(script=RESUME)
    self.assertEqual(code, 0)
    self.assertTrue(out["initialized"])
    self.assertEqual(out["target_section"], "4.0")

  def test_an_empty_registry_from_finalization_still_resumes_at_the_first_track(self):
    with tempfile.TemporaryDirectory() as root:
      p = Project(root)
      p.write("conductor/context/index.md", "# Project Context\n")
      p.write("conductor/context/tracks.md", "# Project Tracks\n\n---\n")
      out, _ = p.run(script=RESUME)
    self.assertFalse(out["initialized"])
    self.assertEqual(out["target_section"], "3.0")


if __name__ == "__main__":
  unittest.main()
