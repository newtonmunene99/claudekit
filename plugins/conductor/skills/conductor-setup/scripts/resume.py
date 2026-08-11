"""Determines the next unblocked setup step in the Conductor workflow.

Run from the project root. Ported from gemini-cli-extensions/conductor and
adapted to the claudekit layout (conductor/context/, conductor/specs/).
Prints JSON: checklist, initialized, setup_complete, target_section, next_step.
target_section mirrors the audit table in SKILL.md section 1.2 — "HALT" means
the project is already initialized and setup must not re-run.
"""

import glob
import json
import os
import sys


def determine_resumption():
  """Checks existing setup artifacts and returns the next unblocked step."""
  context_dir = os.path.join("conductor", "context")
  files = [
      "product.md",
      "product-guidelines.md",
      "tech-stack.md",
      "code_styleguides",
      "workflow.md",
      "index.md",
      "tracks.md",
  ]

  checklist = {}
  for filename in files:
    checklist[filename] = os.path.exists(os.path.join(context_dir, filename))

  track_specs = sorted(glob.glob(os.path.join("conductor", "specs", "*", "spec.md")))
  checklist["specs"] = track_specs

  # Registered tracks or any complete track spec mean setup already ran to
  # completion once — re-running it must never touch existing tracks.
  initialized = checklist["tracks.md"] or bool(track_specs)
  setup_complete = checklist["index.md"]

  # Priority table from SKILL.md section 1.2 — highest match wins.
  chain = [
      ("index.md", "3.0", "Initial plan and track generation"),
      ("workflow.md", "2.6", "Agent Skills selection"),
      ("code_styleguides", "2.5", "Workflow configuration"),
      ("tech-stack.md", "2.4", "Code Style Guide selection"),
      ("product-guidelines.md", "2.3", "Technology Stack definition"),
      ("product.md", "2.2", "Product Guidelines"),
  ]

  target_section = "2.0"
  next_step = "Project inception"
  if initialized:
    target_section = "HALT"
    next_step = None
  else:
    for filename, section, step_name in chain:
      if checklist[filename]:
        target_section = section
        next_step = step_name
        break

  return {
      "initialized": initialized,
      "setup_complete": setup_complete,
      "checklist": checklist,
      "target_section": target_section,
      "next_step": next_step,
  }


if __name__ == "__main__":
  result = determine_resumption()
  print(json.dumps(result, indent=2))
  sys.exit(0)
