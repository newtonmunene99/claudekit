#!/usr/bin/env python3
"""Deterministic plumbing for Conductor: registry, plan, and path checks.

Skills call this instead of re-parsing conductor/ files with the model.
Every subcommand prints ONE JSON object on stdout. Run from the project root.

    conductor_state.py tracks                 eligible / blocked / parallel-ready tracks
    conductor_state.py plan <plan.md>         todo counts, in-progress, ready + parallel batches
    conductor_state.py verify-paths <file.md> repo paths cited in a plan or review exist

Exit codes: 0 ok, 1 usage or unreadable input, 2 verify-paths found missing paths.
Only the standard library is used so the script runs anywhere python3 does.
"""

import glob
import json
import os
import re
import sys

CONTEXT_DIR = os.path.join("conductor", "context")
SPECS_DIR = os.path.join("conductor", "specs")
TRACKS_FILE = os.path.join(CONTEXT_DIR, "tracks.md")

# Registry entries: "- [ ] **Track: desc**" (standard) or "## [ ] Track: desc" (legacy).
# A programme entry may carry a trailing sequencing hint: "** — _order 2; after A_".
TRACK_LINE = re.compile(r"^(?:- |## )\[(?P<status>[ ~x])\]\s*(?P<rest>.+)$")
BOLD_DESC = re.compile(r"^\*\*Track:\s*(?P<desc>.+?)\*\*")
PLAIN_DESC = re.compile(r"^Track:\s*(?P<desc>.+?)\s*(?:—\s*_.*_\s*)?$")
SPEC_LINK = re.compile(r"\(\.\./specs/(?P<id>[^/)]+)/(?:spec\.md|index\.md)\)")
PLAN_LINK = re.compile(r"\((?P<path>\.\./plans/[^)]+\.plan\.md)\)")
TERMINAL = {"completed"}


# --- frontmatter -------------------------------------------------------------

def split_frontmatter(text):
  """Returns (frontmatter_text, body) or (None, text) when no frontmatter."""
  text = text.replace("\r\n", "\n")
  if not text.startswith("---\n"):
    return None, text
  end = text.find("\n---\n", 4)
  if end == -1:
    return None, text
  return text[4:end], text[end + 5:]


def _scalar(raw):
  raw = raw.strip()
  if raw == "" or raw == "~" or raw == "null":
    return None
  if raw.startswith("[") and raw.endswith("]"):
    inner = raw[1:-1].strip()
    return [] if not inner else [_scalar(v) for v in inner.split(",")]
  if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
    return raw[1:-1]
  if raw in ("true", "True"):
    return True
  if raw in ("false", "False"):
    return False
  if re.fullmatch(r"-?\d+", raw):
    return int(raw)
  return raw


def parse_frontmatter(fm_text):
  """Minimal YAML subset: scalars, inline lists, block lists, and a list of flat maps.

  PyYAML is used when installed; this fallback covers exactly the plan format the
  authoring guide prescribes, so plans never need a third-party dependency.
  """
  try:
    import yaml  # type: ignore
    data = yaml.safe_load(fm_text)
    return data if isinstance(data, dict) else {}
  except ImportError:
    pass

  data = {}
  key = None
  items = None  # list being filled for `key`
  current = None  # map being filled inside `items`
  for line in fm_text.split("\n"):
    if not line.strip() or line.lstrip().startswith("#"):
      continue
    indent = len(line) - len(line.lstrip())
    stripped = line.strip()
    if indent == 0:
      k, _, v = stripped.partition(":")
      key, items, current = k.strip(), None, None
      if v.strip() == "":
        items = []
        data[key] = items
      else:
        data[key] = _scalar(v)
      continue
    if items is None:
      continue
    if stripped.startswith("- "):
      rest = stripped[2:]
      if ":" in rest and not rest.startswith("["):
        current = {}
        items.append(current)
        k, _, v = rest.partition(":")
        current[k.strip()] = _scalar(v)
      else:
        current = None
        items.append(_scalar(rest))
      continue
    if current is not None and ":" in stripped:
      k, _, v = stripped.partition(":")
      current[k.strip()] = _scalar(v)
  return data


def read_text(path):
  with open(path, encoding="utf-8") as fh:
    return fh.read()


def as_list(value):
  if value is None:
    return []
  if isinstance(value, list):
    return [str(v) for v in value if v is not None]
  return [str(value)]


# --- tracks ------------------------------------------------------------------

def parse_registry(text):
  tracks = []
  current = None
  for line in text.replace("\r\n", "\n").split("\n"):
    m = TRACK_LINE.match(line.strip())
    if m:
      d = BOLD_DESC.match(m.group("rest")) or PLAIN_DESC.match(m.group("rest"))
      if not d:
        continue
      current = {
          "description": d.group("desc").strip(),
          "status": {" ": "pending", "~": "in_progress", "x": "completed"}[m.group("status")],
          "track_id": None,
          "plan": None,
      }
      tracks.append(current)
      continue
    if current is None:
      continue
    s = SPEC_LINK.search(line)
    if s and current["track_id"] is None:
      current["track_id"] = s.group("id")
    p = PLAN_LINK.search(line)
    if p and current["plan"] is None:
      current["plan"] = os.path.normpath(os.path.join(CONTEXT_DIR, p.group("path")))
  return tracks


def load_metadata(track_id):
  path = os.path.join(SPECS_DIR, track_id, "metadata.json")
  if not os.path.isfile(path):
    return {}
  try:
    with open(path, encoding="utf-8") as fh:
      data = json.load(fh)
    return data if isinstance(data, dict) else {}
  except (OSError, ValueError):
    return {}


def cmd_tracks(_args):
  if not os.path.isfile(TRACKS_FILE):
    return {"error": f"{TRACKS_FILE} not found; run /conductor:conductor-setup"}, 1
  tracks = parse_registry(read_text(TRACKS_FILE))
  completed = {t["track_id"] for t in tracks if t["status"] == "completed" and t["track_id"]}
  eligible, blocked = [], []
  for t in tracks:
    if t["status"] == "completed" or not t["track_id"]:
      continue
    meta = load_metadata(t["track_id"])
    order = meta.get("order")
    entry = {
        **t,
        "order": order if isinstance(order, int) else None,
        "depends_on": as_list(meta.get("depends_on")),
        "programme_id": meta.get("programme_id"),
        "track_role": meta.get("track_role", "implementation"),
    }
    missing = [d for d in entry["depends_on"] if d not in completed]
    if missing:
      entry["missing"] = missing
      blocked.append(entry)
    else:
      eligible.append(entry)
  eligible.sort(key=lambda e: (e["order"] if e["order"] is not None else 999))
  lowest = eligible[0]["order"] if eligible else None
  for e in eligible:
    e["parallel_ready"] = lowest is not None and e["order"] == lowest and sum(
        1 for x in eligible if x["order"] == lowest) > 1
  in_progress = [t["track_id"] for t in tracks if t["status"] == "in_progress"]
  return {
      "tracks": tracks,
      "in_progress": in_progress,
      "eligible": eligible,
      "blocked": blocked,
      "recommended": eligible[0]["track_id"] if eligible else None,
      "all_complete": bool(tracks) and all(t["status"] == "completed" for t in tracks),
  }, 0


# --- plan --------------------------------------------------------------------

def cmd_plan(args):
  if not args:
    return {"error": "usage: conductor_state.py plan <plan.md>"}, 1
  path = args[0]
  if not os.path.isfile(path):
    return {"error": f"plan not found: {path}"}, 1
  fm_text, body = split_frontmatter(read_text(path))
  if fm_text is None:
    return {"error": f"no frontmatter in {path}"}, 1
  fm = parse_frontmatter(fm_text)
  todos = [t for t in (fm.get("todos") or []) if isinstance(t, dict) and t.get("id")]
  by_id = {t["id"]: t for t in todos}
  done = {t["id"] for t in todos if t.get("status") in TERMINAL}

  counts = {"pending": 0, "in_progress": 0, "completed": 0}
  for t in todos:
    counts[t.get("status") if t.get("status") in counts else "pending"] += 1

  ready, waiting = [], []
  for t in todos:
    if t.get("status") in TERMINAL:
      continue
    blockers = [b for b in as_list(t.get("blocked_by")) if b in by_id and b not in done]
    unknown = [b for b in as_list(t.get("blocked_by")) if b not in by_id]
    entry = {
        "id": t["id"],
        "status": t.get("status", "pending"),
        "content": t.get("content", ""),
        "phase": t.get("phase"),
        "files": as_list(t.get("files")),
        "attempts": t.get("attempts", 0),
    }
    # A blocker id that matches no todo is almost always a typo; treat it as
    # blocking so a misspelling cannot silently unblock work.
    if unknown:
      entry["unknown_blockers"] = unknown
    if blockers or unknown:
      entry["blocked_by"] = blockers + unknown
      waiting.append(entry)
    else:
      ready.append(entry)

  # Sync bookends never run in parallel and must keep their frontmatter position.
  sync_ids = {"conductor-sync-in-progress", "conductor-sync-complete"}
  ordered_ids = [t["id"] for t in todos]
  next_todo = ready[0] if ready else None
  stuck = [w for w in waiting if w.get("unknown_blockers")]
  blocked_reason = None
  # The closing bookend is only "next" when every other todo is done. If work
  # remains but none of it is ready (cycle, typo'd blocker), say so instead of
  # letting the loop close the track early.
  if next_todo and next_todo["id"] == "conductor-sync-complete" and (
      counts["pending"] + counts["in_progress"]) > 1:
    next_todo = next((r for r in ready if r["id"] not in sync_ids), None)
    if next_todo is None:
      blocked_reason = "no todo is ready: " + ", ".join(
          f"{w['id']} waits on {w['blocked_by']}" for w in waiting)

  # Parallel batch: ready todos whose declared file sets are pairwise disjoint.
  # Todos without `files` are never batched; they run alone in frontmatter order.
  batch, seen = [], set()
  for r in ready:
    if r["id"] in sync_ids or not r["files"] or r["status"] == "in_progress":
      continue
    if r["id"] == "conductor-sync-in-progress" or any(f in seen for f in r["files"]):
      continue
    if "conductor-sync-in-progress" in ordered_ids and "conductor-sync-in-progress" not in done:
      break
    batch.append(r["id"])
    seen.update(r["files"])

  phases = re.findall(r"^-\s+\*\*(?P<phase>[A-Za-z0-9_.-]+)\b[^*]*\*\*", body, flags=re.M)
  return {
      "plan": path,
      "name": fm.get("name"),
      "counts": counts,
      "total": len(todos),
      "in_progress": [t["id"] for t in todos if t.get("status") == "in_progress"],
      "next": next_todo,
      "ready": ready,
      "waiting": waiting,
      "stuck": stuck,
      "blocked_reason": blocked_reason,
      "parallel_batch": batch if len(batch) > 1 else [],
      "review_rounds": fm.get("review_rounds", 0),
      "phases": phases,
      "sync_bookends_ok": bool(ordered_ids)
      and ordered_ids[0] == "conductor-sync-in-progress"
      and ordered_ids[-1] == "conductor-sync-complete",
  }, 0


# --- verify-paths ------------------------------------------------------------

PATH_TOKEN = re.compile(r"`([^`\s]+)`")
FILES_LINE = re.compile(r"^\s*(?:[-*]\s*)?\*\*Files:?\*\*:?\s*(?P<rest>.+)$", re.I)
LINE_REF = re.compile(r"^(?P<path>[^:]+):(?:L?)(?P<line>\d+)")


def looks_like_repo_path(token):
  if "://" in token or token.startswith(("http", "$", "<", "{")):
    return False
  if token.startswith("conductor/"):
    return False
  if "/" in token:
    return True
  return bool(re.search(r"\.[a-z0-9]{1,6}$", token, re.I)) and " " not in token


def extract_paths(text):
  found = []
  for line in text.replace("\r\n", "\n").split("\n"):
    m = FILES_LINE.match(line)
    if m:
      for tok in PATH_TOKEN.findall(m.group("rest")):
        found.append(tok)
    for tok in PATH_TOKEN.findall(line):
      if looks_like_repo_path(tok):
        found.append(tok)
  seen, ordered = set(), []
  for tok in found:
    tok = tok.rstrip(".,;:")
    if tok not in seen:
      seen.add(tok)
      ordered.append(tok)
  return ordered


def suggest(path):
  base = os.path.basename(path.split(":")[0])
  if not base:
    return []
  hits = [h for h in glob.glob(os.path.join("**", base), recursive=True)
          if ".git" + os.sep not in h]
  if hits:
    return hits[:5]
  # No file with that name anywhere: show what the cited directory does hold.
  parent = os.path.dirname(path.split(":")[0])
  if parent and os.path.isdir(parent):
    return sorted(os.path.join(parent, f) for f in os.listdir(parent))[:5]
  return []


def cmd_verify_paths(args):
  if not args:
    return {"error": "usage: conductor_state.py verify-paths <file.md> [--create-ok]"}, 1
  path = args[0]
  create_ok = "--create-ok" in args
  if not os.path.isfile(path):
    return {"error": f"file not found: {path}"}, 1
  text = read_text(path)
  # Paths under a "Create" label are expected to be missing; treat them as verified.
  create_paths = set()
  if create_ok:
    for m in re.finditer(r"Create[^`\n]*((?:`[^`]+`[,\s]*)+)", text):
      create_paths.update(PATH_TOKEN.findall(m.group(1)))

  results, missing = [], 0
  for tok in extract_paths(text):
    ref = LINE_REF.match(tok)
    file_part = ref.group("path") if ref else tok
    if tok in create_paths:
      status = "create"
    elif os.path.exists(file_part):
      status = "verified"
      if ref:
        try:
          n_lines = sum(1 for _ in open(file_part, encoding="utf-8", errors="ignore"))
        except OSError:
          n_lines = 0
        if int(ref.group("line")) > n_lines:
          status = "line-out-of-range"
    else:
      status = "missing"
    entry = {"path": tok, "status": status}
    if status in ("missing", "line-out-of-range"):
      missing += 1
      if status == "missing":
        entry["suggestions"] = suggest(file_part)
    results.append(entry)
  return {"file": path, "checked": len(results), "missing": missing, "paths": results}, (
      2 if missing else 0)


# --- main --------------------------------------------------------------------

COMMANDS = {"tracks": cmd_tracks, "plan": cmd_plan, "verify-paths": cmd_verify_paths}


def main(argv):
  if len(argv) < 2 or argv[1] not in COMMANDS:
    print(json.dumps({"error": "usage: conductor_state.py <tracks|plan|verify-paths> [args]"}))
    return 1
  result, code = COMMANDS[argv[1]](argv[2:])
  print(json.dumps(result, indent=2))
  return code


if __name__ == "__main__":
  sys.exit(main(sys.argv))
