# Conductor Plan Authoring Guide

Use this guide when generating Conductor plan files (`conductor/plans/*.plan.md`) during `/conductor:conductor-new-track`, `/conductor:conductor-setup`, or when revising an existing track plan.

Techniques adapted from [Superpowers](https://github.com/obra/superpowers) (MIT).

## Plan Header (markdown body)

Every plan body MUST start with:

```markdown
> **Conductor plan:** Runnable directly in Claude Code or via `/conductor:conductor-implement`.
> Follow `conductor/context/workflow.md`, the Git Write Policy, and Agent Output Style in templates/conductor-protocol.md.
```

Below the header, include:

- **Goal** — one sentence
- **Architecture** — 2–3 sentences
- **File structure map** — files to create/modify with one-line responsibility each

## Mandatory sync todos (frontmatter)

Every plan frontmatter MUST include these bookend todos (in addition to phase verification todos when the workflow defines them):

| Order | id | content (summary) |
| ----- | --- | ----------------- |
| **First** | `conductor-sync-in-progress` | Mark track `[~]` in `tracks.md`, set `metadata.json` `status` to `in_progress`, update `updated_at`. Commit only when **Conductor files** is `committed`. |
| **Last** | `conductor-sync-complete` | Mark track `[x]` in `tracks.md`, set `metadata.json` `status` to `completed`, update `updated_at`, then run doc sync and track cleanup. Commit Conductor files only when **Conductor files** is `committed`. |

**Do NOT inject** feature-branch, worktree, or other git-isolation todos by default. Git workflow is chosen at implementation start via the **Git Isolation Protocol** in templates/conductor-protocol.md — unless the user explicitly asked to bake a git workflow into the plan during new-track planning.

### Example frontmatter

```yaml
---
name: Track Title
overview: One-paragraph summary derived from spec
depends_on: [owner_track_id]
blocks: [downstream_track_id]
programme_id: remediation_slug
todos:
  - id: conductor-sync-in-progress
    content: "Conductor — Mark track in progress (tracks.md [~], metadata.json in_progress)"
    status: pending
  - id: example-task
    content: "Reject expired refresh tokens"
    status: pending
  - id: conductor-sync-complete
    content: "Conductor — Mark track complete (tracks.md [x], metadata.json completed)"
    status: pending
isProject: true
---
```

### Optional todo fields

Claude Code may ignore unknown fields — they remain for agent protocol and programme review:

```yaml
- id: context-parity-impl
  content: "Report context parity mismatches"
  status: pending
  kind: refactor        # optional; omit for behaviour todos
  phase: C4
  blocked_by: [metric-client-seam]
  files: [pkg/parity/parity.go, pkg/parity/parity_test.go]
  attempts: 0
```

## Dependencies are data edges, not order

Frontmatter order is the **default** execution order, but `/conductor:conductor-implement` runs any todo whose `blocked_by` are all completed. Declare edges deliberately:

- **Add `blocked_by`** only when the todo **reads the output** of another todo (a type, a seam, a fixture, a file the other creates). "It comes after" is not a dependency.
- **Omit `blocked_by`** for independent work so it can run in parallel. Two behaviour todos in different packages usually have no edge.
- **Always add `files`**: the exact paths the todo creates or modifies. The implement loop only parallelises todos whose `files` are pairwise disjoint; a todo without `files` runs alone.
- Sync bookends are implicit edges: nothing runs before `conductor-sync-in-progress`, and `conductor-sync-complete` waits for everything.

Sanity check: `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" plan <plan>` prints `ready`, `waiting`, and `parallel_batch`. If `waiting` lists an `unknown_blockers` entry, the id is misspelled.

## Task right-sizing

Each frontmatter todo is the smallest unit that:

- Lands as **one green commit** with its own tests (see **One todo, one green commit** in the Workflow)
- Produces an independently verifiable deliverable
- Has a test that fails before it and passes after it, **or** is a pure refactor (`kind: refactor`) that keeps existing tests green

Never split "write failing tests" and "implement" into separate todos: the red step happens inside the todo. A partial slice that no test can observe yet folds into the todo whose test first observes it. A todo that changes a signature owns every call site, including generated bindings and the other side of any seam.

Fold setup, configuration, and scaffolding into the todo whose deliverable needs them. Split only where a reviewer could reject one task while approving its neighbor.

**Action-first todo text:** Start each `content` string with a verb and name the behaviour ("Reject expired refresh tokens", not "Token tests"). One deliverable per todo — no "and then" chains.

## Prerequisite todos

When a test todo assumes injectable fakes, clocks, or seams that production code does not yet expose:

- Prefix `content` with **`PREREQUISITE:`**
- Body must cite **why dependent tests are vacuous** (test output snippet or code path that bypasses fakes)
- Dependent todos list **`Blocked by:** `<prerequisite-id>`** in the plan body
- Programme synthesis pass auto-inserts prerequisites when duplicate or vacuous patterns are detected

Example:

```yaml
- id: metric-client-seam
  content: "PREREQUISITE: make attachClient honour ClientFromContext; repair vacuous TestRun_withFakeClient which hits real backend"
  status: pending
```

## Phased delivery

Tracks with **>12 todos** spanning independent subsystems MUST include a **phase map** in the plan body:

```markdown
## Phases
- **C1 lifecycle** — registry-freeze, env-freeze
- **C2 identity** — identity-validation, load-config
- **C3 validation** — numeric-validation
- **C4 parity** — context-parity, adk-validation ← lands after Track B
```

Label phase todos with optional `phase: C4` in frontmatter. Cross-track phase notes use `← lands after Track X`.

## Namespace authority

When a track owns synthetic IDs (`_prefix.*`), reserved prefixes, or a new package:

- Add plan body section **Namespace authority**
- One track owns constants + `IsReserved` / `IsFrameworkID` (or equivalent)
- Other tracks **import only** — no parallel rename/enforcement todos
- Programme synthesis assigns a single owner; non-owners get **Removed — owned by Track X** stubs

## Escape hatches for strict validation

When adding strict registration validation (reject empty slices, required fields, etc.):

- **Mandatory User Prompt Protocol** before plan approval: "What opt-out API preserves existing capability?"
- Same track that adds the rule MUST implement the escape hatch (e.g. `NoSLOs()` sentinel)

## Test design constraints

Tests in the plan follow **Test Quality Rules** (`templates/test-quality.md`): literal expectations, real objects or fakes before mocks, no tautological tests.

**Contract probes.** When a todo consumes an external API, CLI, or file format whose real payloads are not already captured in the repo, add a `PREREQUISITE:` probe todo before it: a read-only live capture saved as testdata. Every fixture and asserted shape in later todos comes from that capture or cites its source (proto, schema, official docs). Never write test code in the plan against a payload shape nobody has seen.

**Registration points.** For a new package, resource, command, or module, inspect the most recent comparable addition (`git show --stat <commit>`) and give every non-source file it touched a todo: CI matrices, test harnesses, examples, docs indexes, provider registration.

Flag and fix plan todos that:

- Sleep >5s in tests (require injectable clocks)
- Require network I/O when the package already has slow integration tests
- Hit real external services when fakes exist but are bypassed

Require injectable clocks/fakes. Add optional **`no-network-tests-gate`** todo with acceptance: `go test -short` (or project equivalent) passes without external calls.

## Docs track dependencies

Documentation or troubleshooting tracks that key content on diagnostic IDs MUST:

- Declare `depends_on` the namespace-owner track in plan frontmatter
- Gate id-keyed todos until owner track completes (e.g. troubleshooting table waits for A+B id constants)

## Plan body detail (per task)

For each todo, the markdown body MUST include a section with:

- **Files:** `Create`, `Modify`, and `Test` paths (exact paths)
- **Interfaces:** what this task consumes from earlier tasks and what later tasks rely on (signatures, types, function names)
- **Micro-steps** (when workflow uses TDD), as a **numbered list** (one bounded action per step):
  1. Write failing test
  2. Run test — verify it fails for the expected reason
  3. Implement minimal code
  4. Run test — verify pass
  5. Commit (Git Write Policy applies)
- **Commands** with expected output where applicable

## No placeholders

These are plan failures — never write them:

- TBD, TODO, "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases" without specifics
- "Write tests for the above" without actual test code
- "Similar to Task N" (repeat the code — tasks may be read out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)

## Path verification checklist

**Run after plan draft, before user confirmation.** Block plan approval on unresolved paths.

1. **Run the script** (see **Deterministic Plumbing Protocol** in templates/conductor-protocol.md):

   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" verify-paths conductor/plans/<file>.plan.md --create-ok
   ```

   It extracts every `**Files:**` path and inline backtick repo path, skips `conductor/` artifacts, treats paths labelled `Create` as expected-missing, checks `file:line` references are in range, and suggests replacements for missing files. Exit code 2 means something is unresolved.
2. **Manual fallback** (no `python3`): `test -f <path>` / `test -d <path>`, glob for naming variants, and `Read` files for line references.
3. **Record verified paths** in a plan body **Path verification** subsection:

   ```markdown
   ## Path verification
   > **Path note:** `LoadSuite` lives in `pkg/suite/suite.go` (type at ~613). There is no `pkg/suite/load.go`.
   ```

4. **Fix table:** If any path fails verification, present a table to the user before `Confirm Plan`:

   | Plan reference | Status | Correct path |
   | -------------- | ------ | -------------- |
   | `pkg/suite/load.go` | Missing | `pkg/suite/suite.go` |

5. **Halt** on unresolved paths — do not proceed to user approval until fixed or user explicitly accepts a documented alternative.

## Plan self-review

After drafting the complete plan, hand this checklist to a **fresh verifier** per the **Independent Verification Protocol** in templates/conductor-protocol.md (the context that drafted the plan does not grade it). Fix every rejected item inline, then re-verify; after **2** rounds escalate to the user.

1. **Spec coverage:** Each spec requirement maps to at least one todo.
2. **Placeholder scan:** No banned patterns above.
3. **Type consistency:** Signatures and names match across tasks.
4. **Sync bookends:** `conductor-sync-in-progress` is first; `conductor-sync-complete` is last.
5. **Phase todos:** Every phase has a `verify-p<N>` todo whose `blocked_by` lists the phase's other todos. A plan without phases counts as one phase and gets one `verify` todo just before `conductor-sync-complete`.
6. **Path verification:** All repo paths verified per checklist above; Path verification subsection present.
7. **Prerequisites:** Vacuous-test risks have PREREQUISITE todos with evidence.
8. **Test constraints:** No unbounded sleeps or undeclared network dependencies.
9. **Namespace:** Single owner for shared ID registries when programme spans tracks.
10. **Edges:** Every `blocked_by` names a real data dependency; every implementation todo declares `files`; `conductor_state.py plan` reports no `unknown_blockers`.
11. **Green commits:** No todo is only "write failing tests" or only "implement". Each behaviour todo names the test that fails before it; each `kind: refactor` todo names the existing tests that must stay green.
12. **Contracts:** Every external payload shape used in tests has a probe todo or a cited source. No fixture is invented.
13. **Registration points:** Every CI, harness, example, or registration file touched by the last comparable addition has a todo.
14. **Tooling:** Dependency, build, and codegen steps use the exact commands and flags recorded in **Tech Stack** and the Workflow's **Development Commands**.

## Amending a plan mid-track

Plans change during implementation: a hand check finds defects, the user adds scope, or a design turns out wrong. Keep the frontmatter and the body in step so the next session can trust both.

1. **New todos** get the full shape: `id`, `content`, `status: pending`, `phase`, `files`, and `blocked_by` only for real data edges. Append them in the phase they belong to, before `conductor-sync-complete`.
2. **New phase:** add its todos, a body section for each todo (Files, Interfaces, micro-steps), a `verify-p<N>` hand-check todo when the workflow uses phase checkpoints, and a line in the **Phases** map. Never add frontmatter todos without their body sections.
3. **Changed design:** rewrite every affected pending todo (content, files, body) in the same edit, and update the spec requirement.
4. **Side commits** made during the track but outside any todo (a fix in a sibling repo, an unrelated bug found while testing) go in a `## Side commits` list in the plan body: SHA, repo, one line of why. Status and review then see them.
5. **Check:** run `conductor_state.py plan <plan>` and `verify-paths <plan> --create-ok`; fix any `unknown_blockers` or missing paths before continuing.

**Follow-up on a finished track.** Decisions reached after a track closed go in a dated `## Addendum YYYY-MM-DD` section of its spec, archived or not. New code work becomes a new track or a backlog item; do not reopen an archived track.

## Direct plan execution

Users may run this plan from Claude Code chat without `/conductor:conductor-implement`. Sync bookend todos keep `tracks.md` and `metadata.json` aligned with progress. Implementation todos follow `conductor/context/workflow.md` including TDD and Systematic Debugging Protocol.
