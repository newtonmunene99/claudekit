#!/usr/bin/env python3
"""Deterministic plumbing for Conductor: registry, plan, and path checks.

Skills call this instead of re-parsing conductor/ files with the model.
Every subcommand prints ONE JSON object on stdout. Run from the project root.

    conductor_state.py tracks                 eligible / blocked / parallel-ready tracks
    conductor_state.py plan <plan.md>         todo counts, in-progress, ready + parallel batches
    conductor_state.py verify-paths <file.md> repo paths cited in a plan or review exist
    conductor_state.py backlog                open / done / parked backlog items with stable slugs
    conductor_state.py set-todo <plan.md> <todo_id> <status> [--sha <sha|uncommitted>] [--on <reason>] [--attempts <n>]
                                              edit one todo's status in place (no YAML rewrite)
    conductor_state.py track-status <track_id> <pending|in_progress|completed>
                                              registry marker + metadata status + real UTC updated_at
    conductor_state.py doctor [--fix] [--stamp]
                                              drift from current conventions; --fix applies the
                                              mechanical repairs, --stamp records the plugin version
    conductor_state.py archive <track_id> [--force]
                                              move spec + plan to conductor/archive/<id>/
                                              and leave an "(archived)" ledger line

Exit codes: 0 ok, 1 usage or unreadable input, 2 verify-paths found missing paths,
3 archive needs confirmation (track incomplete or has deferred checks; rerun with --force).
Only the standard library is used so the script runs anywhere python3 does.
"""

import datetime
import glob
import json
import os
import re
import shutil
import sys

CONTEXT_DIR = os.path.join("conductor", "context")
SPECS_DIR = os.path.join("conductor", "specs")
ARCHIVE_DIR = os.path.join("conductor", "archive")
TRACKS_FILE = os.path.join(CONTEXT_DIR, "tracks.md")
BACKLOG_FILE = os.path.join(CONTEXT_DIR, "backlog.md")
INDEX_FILE = os.path.join(CONTEXT_DIR, "index.md")
WORKFLOW_FILE = os.path.join(CONTEXT_DIR, "workflow.md")
PLUGIN_JSON = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                           ".claude-plugin", "plugin.json")

# Registry entries: "- [ ] **Track: desc**" (standard) or "## [ ] Track: desc" (legacy).
# A programme entry may carry a trailing sequencing hint: "** — _order 2; after A_".
TRACK_LINE = re.compile(r"^(?:- |## )\[(?P<status>[ ~x])\]\s*(?P<rest>.+)$")
BOLD_DESC = re.compile(r"^\*\*Track:\s*(?P<desc>.+?)\*\*")
PLAIN_DESC = re.compile(r"^Track:\s*(?P<desc>.+?)\s*(?:—\s*_.*_\s*)?$")
# Archived tracks may stay in the registry as a ledger line linking into archive/.
SPEC_LINK = re.compile(r"\(\.\./(?:specs|archive)/(?P<id>[^/)]+)/(?:spec\.md|index\.md)\)")
PLAN_LINK = re.compile(r"\((?P<path>\.\./plans/[^)]+\.plan\.md)\)")
# A deferred hand check never blocks later work; status still reports it.
TERMINAL = {"completed", "deferred"}


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
    path = os.path.join(ARCHIVE_DIR, track_id, "metadata.json")
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
  for t in tracks:
    t["git"] = load_metadata(t["track_id"]).get("git") if t["track_id"] else None
  completed = {t["track_id"] for t in tracks if t["status"] == "completed" and t["track_id"]}
  # Archiving may drop the registry entry; the archive folder still proves completion,
  # so a depends_on on an archived track must not block forever.
  if os.path.isdir(ARCHIVE_DIR):
    completed.update(d for d in os.listdir(ARCHIVE_DIR)
                     if os.path.isdir(os.path.join(ARCHIVE_DIR, d)))
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
  # Completed tracks whose spec folder has not been moved to archive/ yet.
  archivable = [t["track_id"] for t in tracks if t["status"] == "completed" and t["track_id"]
                and os.path.isdir(os.path.join(SPECS_DIR, t["track_id"]))]
  return {
      "tracks": tracks,
      "in_progress": in_progress,
      "archivable": archivable,
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

  counts = {"pending": 0, "in_progress": 0, "completed": 0, "deferred": 0, "blocked": 0}
  for t in todos:
    counts[t.get("status") if t.get("status") in counts else "pending"] += 1

  def is_verify(todo):
    return str(todo["id"]).startswith("verify-") or bool(
        re.search(r"manual verification", str(todo.get("content", "")), re.I))

  ready, waiting, blocked_ext = [], [], []
  for t in todos:
    if t.get("status") in TERMINAL:
      continue
    # Blocked on something outside the plan (an upstream PR, an access grant):
    # never ready until someone sets it back to pending.
    if t.get("status") == "blocked":
      blocked_ext.append({"id": t["id"], "on": t.get("blocked_on")})
      continue
    blockers = [b for b in as_list(t.get("blocked_by")) if b in by_id and b not in done]
    # A phase's hand check runs last in its phase, whatever blocked_by says.
    if is_verify(t) and t.get("phase") is not None:
      blockers += [o["id"] for o in todos if o is not t and o.get("phase") == t.get("phase")
                   and o["id"] not in done and not is_verify(o) and o["id"] not in blockers]
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
      counts["pending"] + counts["in_progress"] + counts["blocked"]) > 1:
    next_todo = next((r for r in ready if r["id"] not in sync_ids), None)
    if next_todo is None:
      blocked_reason = "no todo is ready: " + ", ".join(
          [f"{w['id']} waits on {w['blocked_by']}" for w in waiting]
          + [f"{b['id']} is blocked on {b['on']}" for b in blocked_ext])

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

  phases = []
  for t in todos:
    if t.get("phase") is not None and str(t["phase"]) not in phases:
      phases.append(str(t["phase"]))
  if not phases:
    section = re.search(r"^##\s+Phases\s*\n(?P<s>(?:[ \t]*-.*\n?)+)", body, flags=re.M)
    if section:
      phases = re.findall(r"^\s*-\s+\*\*(?P<p>[A-Za-z0-9_.-]+)", section.group("s"), flags=re.M)
  return {
      "plan": path,
      "name": fm.get("name"),
      "counts": counts,
      "total": len(todos),
      "in_progress": [t["id"] for t in todos if t.get("status") == "in_progress"],
      "deferred": [{"id": t["id"], "phase": t.get("phase")}
                   for t in todos if t.get("status") == "deferred"],
      "blocked": blocked_ext,
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


# --- backlog -----------------------------------------------------------------

# Backlogs come in two shapes: checkbox items ("- [ ] **Title** — note") and
# section headings ("## Title"). Neither carries an id, so items are addressed
# by a slug of their title.
BACKLOG_ITEM = re.compile(r"^- \[(?P<status>[ x~])\]\s+(?P<rest>.+)$")
BACKLOG_HEADING = re.compile(r"^#{2,4}\s+(?P<rest>.+)$")
PARKED = re.compile(r"^\**\s*PARKED\b[:\s-]*", re.I)


def backlog_slug(title, max_words=8):
  words = re.findall(r"[a-z0-9]+", title.lower().replace("`", ""))
  return "-".join(words[:max_words])


def _backlog_title(rest):
  bold = re.match(r"^\*\*(?P<t>.+?)\*\*", rest)
  title = bold.group("t") if bold else rest.split(" — ")[0]
  return PARKED.sub("", title.strip()).rstrip(" .:")


def cmd_backlog(_args):
  if not os.path.isfile(BACKLOG_FILE):
    return {"items": [], "open": 0, "duplicates": [], "missing": True}, 0
  lines = read_text(BACKLOG_FILE).replace("\r\n", "\n").split("\n")
  # When a file has checkbox items, its headings only group them.
  headings_are_items = not any(BACKLOG_ITEM.match(line) for line in lines)
  items, section = [], None
  for n, line in enumerate(lines, 1):
    m = BACKLOG_ITEM.match(line)
    h = None if m else BACKLOG_HEADING.match(line)
    if h and not headings_are_items:
      section = h.group("rest").strip()
      continue
    if not (m or h):
      continue
    rest = (m or h).group("rest").strip()
    if re.search(r"do not re-propose|won'?t do|\bdecided\b", rest, re.I):
      status = "decided"
    elif m and m.group("status") == "x":
      status = "done"
    elif PARKED.match(rest) or re.search(r"\(paused\b", rest, re.I):
      status = "parked"
    elif re.search(r"_\(gated\b", rest):
      status = "gated"
    elif h and re.search(r"~~|\(promoted|\(done", rest, re.I):
      status = "done"
    else:
      status = "open"
    title = _backlog_title(rest)
    items.append({"slug": backlog_slug(title), "title": title, "status": status,
                  "line": n, "section": section})
  seen, duplicates = set(), []
  for item in items:
    if item["slug"] in seen and item["slug"] not in duplicates:
      duplicates.append(item["slug"])
    seen.add(item["slug"])
  return {
      "items": items,
      "open": sum(1 for i in items if i["status"] == "open"),
      "duplicates": duplicates,
  }, 0


# --- archive -----------------------------------------------------------------

INDEX_PLAN_LINK = re.compile(r"\((?P<path>\.\./\.\./plans/[^)]+\.plan\.md)\)")


def _plan_from_index(spec_dir):
  index = os.path.join(spec_dir, "index.md")
  if not os.path.isfile(index):
    return None
  m = INDEX_PLAN_LINK.search(read_text(index))
  return os.path.normpath(os.path.join(spec_dir, m.group("path"))) if m else None


def _registry_block(lines, track_id):
  """Returns (start, end) of the registry entry whose links name track_id, or None."""
  starts = [i for i, line in enumerate(lines) if TRACK_LINE.match(line.strip())]
  for n, start in enumerate(starts):
    end = starts[n + 1] if n + 1 < len(starts) else len(lines)
    for j in range(start + 1, end):
      if lines[j].strip() == "---" or lines[j].startswith("#"):
        end = j
        break
    if any(f"/{track_id}/" in line for line in lines[start + 1:end]):
      return start, end
  return None


def _archive_registry_entry(text, track_id):
  """Turns the track's registry entry into a one-line ledger that still links its spec.

  The header keeps the user's wording and any order hint; it gains [x] and
  "(archived)". The plan link is dropped and the spec link points into archive/.
  """
  lines = text.replace("\r\n", "\n").split("\n")
  found = _registry_block(lines, track_id)
  if found is None:
    return text, False
  start, end = found
  header = re.sub(r"\[[ ~x]\]", "[x]", lines[start], count=1)
  if "(archived)" not in header:
    header = header.rstrip() + " (archived)"
  body = [line.replace(f"../specs/{track_id}/", f"../archive/{track_id}/")
          for line in lines[start + 1:end] if not PLAN_LINK.search(line)]
  return "\n".join(lines[:start] + [header] + body + lines[end:]), True


def cmd_archive(args):
  ids = [a for a in args if not a.startswith("--")]
  force = "--force" in args
  if len(ids) != 1:
    return {"error": "usage: conductor_state.py archive <track_id> [--force]"}, 1
  track_id = ids[0]
  if not os.path.isfile(TRACKS_FILE):
    return {"error": f"{TRACKS_FILE} not found; run /conductor:conductor-setup"}, 1
  spec_dir = os.path.join(SPECS_DIR, track_id)
  dest = os.path.join(ARCHIVE_DIR, track_id)
  if os.path.isdir(dest):
    return {"error": f"already archived: {dest}"}, 1
  if not os.path.isdir(spec_dir):
    return {"error": f"spec folder not found: {spec_dir}"}, 1

  text = read_text(TRACKS_FILE)
  track = next((t for t in parse_registry(text) if t["track_id"] == track_id), None)
  plan = (track or {}).get("plan") or _plan_from_index(spec_dir)
  deferred = []
  if plan and os.path.isfile(plan):
    fm_text, _ = split_frontmatter(read_text(plan))
    todos = (parse_frontmatter(fm_text).get("todos") or []) if fm_text else []
    deferred = [t["id"] for t in todos if isinstance(t, dict) and t.get("status") == "deferred"]

  reasons = []
  if track is None or track["status"] != "completed":
    reasons.append("not_completed")
  if deferred:
    reasons.append("deferred_checks")
  if reasons and not force:
    return {"track_id": track_id, "needs_confirmation": reasons, "deferred": deferred}, 3

  os.makedirs(ARCHIVE_DIR, exist_ok=True)
  shutil.move(spec_dir, dest)
  moved = [{"from": spec_dir, "to": dest}]
  if plan and os.path.isfile(plan):
    base = os.path.basename(plan)
    shutil.move(plan, os.path.join(dest, base))
    moved.append({"from": plan, "to": os.path.join(dest, base)})
    index = os.path.join(dest, "index.md")
    if os.path.isfile(index):
      updated = read_text(index).replace(f"../../plans/{base}", f"./{base}")
      with open(index, "w", encoding="utf-8") as fh:
        fh.write(updated)

  new_text, rewritten = _archive_registry_entry(text, track_id)
  if rewritten:
    with open(TRACKS_FILE, "w", encoding="utf-8") as fh:
      fh.write(new_text)
  return {
      "track_id": track_id,
      "moved": moved,
      "registry": "ledger" if rewritten else "entry-not-found",
      "forced": bool(reasons),
      "deferred": deferred,
  }, 0


# --- writes ------------------------------------------------------------------

TODO_STATUSES = ("pending", "in_progress", "completed", "deferred", "blocked")
TRACK_STATUSES = {"pending": (" ", "new"), "in_progress": ("~", "in_progress"),
                  "completed": ("x", "completed")}


def _flag(args, name):
  if name in args:
    i = args.index(name)
    if i + 1 < len(args):
      return args[i + 1], args[:i] + args[i + 2:]
  return None, args


def cmd_set_todo(args):
  """Edits one todo's lines in place so the rest of the plan keeps its formatting."""
  sha, args = _flag(list(args), "--sha")
  on, args = _flag(args, "--on")
  attempts, args = _flag(args, "--attempts")
  if len(args) != 3 or args[2] not in TODO_STATUSES:
    return {"error": "usage: conductor_state.py set-todo <plan.md> <todo_id> "
                     f"<{'|'.join(TODO_STATUSES)}> [--sha <sha|uncommitted>] [--on <reason>] [--attempts <n>]"}, 1
  path, todo_id, status = args
  if status == "blocked" and not on:
    return {"error": "blocked needs --on <what it waits for>"}, 1
  if attempts is not None and not attempts.isdigit():
    return {"error": "--attempts takes a whole number"}, 1
  if not os.path.isfile(path):
    return {"error": f"plan not found: {path}"}, 1
  fm_text, body = split_frontmatter(read_text(path))
  if fm_text is None:
    return {"error": f"no frontmatter in {path}"}, 1
  lines = fm_text.split("\n")
  id_line = re.compile(r"^(?P<dash>\s*)-\s+id:\s*['\"]?" + re.escape(todo_id) + r"['\"]?\s*$")
  start = next((i for i, line in enumerate(lines) if id_line.match(line)), None)
  if start is None:
    return {"error": f"todo not found in {path}: {todo_id}"}, 1
  indent = " " * (len(id_line.match(lines[start]).group("dash")) + 2)
  end = start + 1
  # Fields sit at the todo's indent + 2; the next todo starts at the dash indent.
  while end < len(lines) and lines[end].startswith(indent):
    end += 1
  fields = lines[start + 1:end]

  def set_field(key, value):
    for i, line in enumerate(fields):
      if line.strip().startswith(key + ":"):
        fields[i] = f"{indent}{key}: {value}"
        return
    fields.append(f"{indent}{key}: {value}")

  set_field("status", status)
  if sha:
    for i, line in enumerate(fields):
      m = re.match(r"^(\s*content:\s*)(?P<v>.*)$", line)
      if m:
        v = m.group("v").rstrip()
        if "(uncommitted)" in v:
          v = v.replace("(uncommitted)", f"({sha})")
        elif len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
          v = v[:-1] + f" ({sha})" + v[-1]
        else:
          v = f"{v} ({sha})"
        fields[i] = m.group(1) + v
        break
  if attempts is not None:
    set_field("attempts", attempts)
  if status == "blocked":
    set_field("blocked_on", json.dumps(on))
  else:
    fields = [line for line in fields if not line.strip().startswith("blocked_on:")]
  new_fm = "\n".join(lines[:start + 1] + fields + lines[end:])
  with open(path, "w", encoding="utf-8") as fh:
    fh.write("---\n" + new_fm + "\n---\n" + body)
  return {"plan": path, "todo": todo_id, "status": status, "sha": sha, "blocked_on": on,
          "attempts": attempts}, 0


def cmd_track_status(args):
  if len(args) != 2 or args[1] not in TRACK_STATUSES:
    return {"error": "usage: conductor_state.py track-status <track_id> <pending|in_progress|completed>"}, 1
  track_id, status = args
  marker, meta_status = TRACK_STATUSES[status]
  if not os.path.isfile(TRACKS_FILE):
    return {"error": f"{TRACKS_FILE} not found; run /conductor:conductor-setup"}, 1
  lines = read_text(TRACKS_FILE).replace("\r\n", "\n").split("\n")
  found = _registry_block(lines, track_id)
  if found is None:
    return {"error": f"track not in registry: {track_id}"}, 1
  lines[found[0]] = re.sub(r"\[[ ~x]\]", f"[{marker}]", lines[found[0]], count=1)
  with open(TRACKS_FILE, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))
  now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
  meta_path = os.path.join(SPECS_DIR, track_id, "metadata.json")
  meta = load_metadata(track_id)
  if os.path.isfile(meta_path):
    meta["status"], meta["updated_at"] = meta_status, now
    with open(meta_path, "w", encoding="utf-8") as fh:
      fh.write(json.dumps(meta, indent=2) + "\n")
  return {"track_id": track_id, "status": status, "updated_at": now,
          "metadata": os.path.isfile(meta_path)}, 0


# --- doctor ------------------------------------------------------------------

VERSION_STAMP = re.compile(r"<!--\s*conductor:\s*(?P<v>[0-9][0-9A-Za-z.+-]*)\s*-->")
# Phrases that only appear in workflow copies made by older plugin versions.
STALE_WORKFLOW_MARKERS = (
    "Create Checkpoint Commit",
    "Commit Plan Update",
    "curl -X POST http://localhost:8080",
    "Agent Output Style** in templates/conductor-protocol.md (**",
)
GITIGNORE_CONTRADICTION = "meant to be committed"


def _plugin_version():
  try:
    with open(PLUGIN_JSON, encoding="utf-8") as fh:
      return json.load(fh).get("version")
  except (OSError, ValueError):
    return None


def _orphaned_plans():
  """Plans still in plans/ although their track's index already lives in archive/."""
  found = []
  for index in sorted(glob.glob(os.path.join(ARCHIVE_DIR, "*", "index.md"))):
    m = INDEX_PLAN_LINK.search(read_text(index))
    if m:
      plan = os.path.normpath(os.path.join(os.path.dirname(index), m.group("path")))
      if os.path.isfile(plan):
        found.append({"plan": plan, "archive": os.path.dirname(index)})
  return found


def _backlog_blocks(lines):
  """Splits backlog lines into (start, end) blocks: an item line plus its indented body."""
  blocks = []
  i = 0
  while i < len(lines):
    if BACKLOG_ITEM.match(lines[i]):
      j = i + 1
      while j < len(lines) and (not lines[j].strip() or lines[j][:1] in " \t"):
        j += 1
      blocks.append((i, j))
      i = j
    else:
      i += 1
  return blocks


def _doctor_issues():
  issues = []
  plugin_version = _plugin_version()
  if not os.path.isfile(INDEX_FILE):
    return [{"id": "not_set_up", "fix": "skill", "detail": "run /conductor:conductor-setup"}], None
  stamp = VERSION_STAMP.search(read_text(INDEX_FILE))
  project_version = stamp.group("v") if stamp else None
  if os.path.isfile(WORKFLOW_FILE):
    workflow = read_text(WORKFLOW_FILE)
    if "## Working Agreements" not in workflow:
      issues.append({"id": "no_working_agreements", "fix": "skill",
                     "detail": "workflow.md has no Working Agreements section"})
    if "## Agent Skills" not in workflow:
      issues.append({"id": "no_agent_skills", "fix": "skill",
                     "detail": "workflow.md has no Agent Skills table"})
    if "AI AGENT INSTRUCTION" in workflow:
      issues.append({"id": "unadapted_workflow", "fix": "skill",
                     "detail": "Development Commands still hold the template placeholder"})
    stale = [m for m in STALE_WORKFLOW_MARKERS if m in workflow]
    if stale:
      issues.append({"id": "stale_workflow_sections", "fix": "skill",
                     "detail": "workflow.md carries old protocol text: " + "; ".join(stale)})
  for path, what in ((TRACKS_FILE, "tracks.md"), (BACKLOG_FILE, "backlog.md")):
    if not os.path.isfile(path):
      issues.append({"id": "missing_" + what.split(".")[0], "fix": "auto",
                     "detail": f"{what} is missing"})
  orphans = _orphaned_plans()
  if orphans:
    issues.append({"id": "orphaned_plans", "fix": "auto",
                   "detail": ", ".join(o["plan"] for o in orphans)})
  dups = cmd_backlog([])[0]["duplicates"]
  if dups:
    issues.append({"id": "backlog_duplicates", "fix": "auto",
                   "detail": ", ".join(dups) + " (identical copies are removed; differing ones need a person)"})
  if os.path.isfile(".gitignore") and GITIGNORE_CONTRADICTION in read_text(".gitignore"):
    issues.append({"id": "gitignore_contradiction", "fix": "auto",
                   "detail": ".gitignore says Conductor files must not be ignored"})
  if project_version is None:
    issues.append({"id": "unstamped_version", "fix": "stamp",
                   "detail": "index.md does not record the Conductor version it follows"})
  elif plugin_version and project_version != plugin_version:
    issues.append({"id": "outdated_version", "fix": "stamp",
                   "detail": f"project follows {project_version}, plugin is {plugin_version}"})
  return issues, project_version


def _write(path, text):
  with open(path, "w", encoding="utf-8") as fh:
    fh.write(text)


def _doctor_fix():
  fixed = []
  for o in _orphaned_plans():
    base = os.path.basename(o["plan"])
    shutil.move(o["plan"], os.path.join(o["archive"], base))
    index = os.path.join(o["archive"], "index.md")
    _write(index, read_text(index).replace(f"../../plans/{base}", f"./{base}"))
    fixed.append(f"moved {o['plan']} into {o['archive']}")
  if os.path.isfile(BACKLOG_FILE):
    lines = read_text(BACKLOG_FILE).replace("\r\n", "\n").split("\n")
    seen, drop = set(), set()
    for start, end in _backlog_blocks(lines):
      key = "\n".join(line.rstrip() for line in lines[start:end]).strip()
      if key in seen:
        drop.update(range(start, end))
      seen.add(key)
    if drop:
      _write(BACKLOG_FILE, "\n".join(l for i, l in enumerate(lines) if i not in drop))
      fixed.append(f"removed {len(drop)} duplicated backlog lines")
  if os.path.isfile(".gitignore") and GITIGNORE_CONTRADICTION in read_text(".gitignore"):
    kept = [l for l in read_text(".gitignore").split("\n") if GITIGNORE_CONTRADICTION not in l]
    _write(".gitignore", "\n".join(kept))
    fixed.append("removed the 'do not ignore' line from .gitignore")
  if not os.path.isfile(TRACKS_FILE):
    _write(TRACKS_FILE, "# Project Tracks\n\nThis file tracks all major tracks for the project. "
                        "Each track has its own spec and Conductor plan.\n\n---\n")
    fixed.append("created tracks.md")
  if not os.path.isfile(BACKLOG_FILE):
    _write(BACKLOG_FILE, "# Backlog\n\nWork not yet promoted to a track. "
                         "Format: Backlog Format in the Conductor protocol.\n")
    fixed.append("created backlog.md")
  return fixed


def _doctor_stamp():
  version = _plugin_version()
  text = read_text(INDEX_FILE)
  stamp = f"<!-- conductor: {version} -->"
  text = VERSION_STAMP.sub(stamp, text, count=1) if VERSION_STAMP.search(text) else stamp + "\n" + text
  _write(INDEX_FILE, text)
  return f"stamped index.md with {version}"


def cmd_doctor(args):
  fixed = []
  if "--fix" in args and os.path.isfile(INDEX_FILE):
    fixed += _doctor_fix()
  if "--stamp" in args and os.path.isfile(INDEX_FILE):
    fixed.append(_doctor_stamp())
  issues, project_version = _doctor_issues()
  return {
      "plugin_version": _plugin_version(),
      "project_version": project_version,
      "issues": issues,
      "fixed": fixed,
      "clean": not issues,
  }, 0


# --- main --------------------------------------------------------------------

COMMANDS = {"tracks": cmd_tracks, "plan": cmd_plan, "verify-paths": cmd_verify_paths,
            "backlog": cmd_backlog, "archive": cmd_archive,
            "set-todo": cmd_set_todo, "track-status": cmd_track_status, "doctor": cmd_doctor}


def main(argv):
  if len(argv) < 2 or argv[1] not in COMMANDS:
    print(json.dumps({"error": "usage: conductor_state.py <tracks|plan|verify-paths|backlog|archive|set-todo|track-status|doctor> [args]"}))
    return 1
  result, code = COMMANDS[argv[1]](argv[2:])
  print(json.dumps(result, indent=2))
  return code


if __name__ == "__main__":
  sys.exit(main(sys.argv))
