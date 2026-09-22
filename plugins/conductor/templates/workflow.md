# Project Workflow

## Agent Messages During Implementation

Follow **Agent Output Style** in templates/conductor-protocol.md: lead with what now works, restate the task N/M and track, name the next todo, and skip preambles and closers.

## Working Agreements

Standing answers that every Conductor command reads before asking anything. A prompt whose answer is recorded here is skipped, and a recorded git answer counts as the user's approval under the **Git Write Policy**. Edit freely. See **Working Agreements Protocol** in templates/conductor-protocol.md.

| Agreement | Value | Options |
| --------- | ----- | ------- |
| Conductor files | `local` | `local`: `conductor/` is gitignored and never committed · `committed`: Conductor files are committed |
| Commits | `agent` | `agent`: Claude commits each todo · `user`: Claude never runs git writes; it hands you commit messages at each phase checkpoint |
| Commit approval | `standing` | `standing`: this table is the approval, so todo commits and notes run without asking · `track`: one approval at track start · `each`: ask before every git write |
| Branch | `current` | `current` · `feature` (`feature/<track_id>`) · `worktree` · `ask`: ask at each track start |
| Autonomy | `until-needed` | `until-needed`: run todos and phases back to back, stopping only for a hand check, an escalation, or a decision · `phase`: also pause after every phase · `todo`: pause after every todo |
| Manual verification | `user-visible` | `user-visible`: hand checks only for phases with something to see or click · `every-phase` · `off` |
| Verification runtime | _(describe)_ | Who runs the app and how, e.g. "You run `task dev` in your own terminal; tell me when to restart it." |
| Verifier | `per-phase` | `per-phase`: fresh verifier per phase, plus per todo for risky changes · `per-todo` · `off` |
| Red commits | `never` | `never`: every commit passes its tests · `allowed`: a failing-test commit may land before its implementation |

### Standing rules

Rules stated during work that should apply to every session, one line each. Conductor proposes additions here when you state one.

- _(none yet)_

## Guiding Principles

1. **The Plan is the Source of Truth:** All work must be tracked in the Conductor plan file (`conductor/plans/*.plan.md` frontmatter `todos`)
2. **The Tech Stack is Deliberate:** Changes to the tech stack must be documented in `conductor/context/tech-stack.md` *before* implementation
3. **Test-Driven Development:** Write unit tests before implementing functionality
4. **High Code Coverage:** Aim for >80% code coverage for all modules
5. **User Experience First:** Every decision should prioritize user experience
6. **Non-Interactive & CI-Aware:** Prefer non-interactive commands. Use `CI=true` for watch-mode tools (tests, linters) to ensure single execution.

## Task Workflow

All tasks follow a strict lifecycle. **All Git write operations** (staging, commits, notes, etc.) MUST follow the **Git Write Policy** in templates/conductor-protocol.md.

### Standard Task Workflow

1. **Select Task:** Run `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/conductor_state.py" plan <plan>` and take `next` (the first todo whose `blocked_by` are all completed, in frontmatter order). When `parallel_batch` is non-empty, follow the **Parallel Dispatch Protocol** in templates/conductor-protocol.md before continuing. Fallback without `python3`: the next pending todo in frontmatter order whose `blocked_by` are all completed.

2. **Mark In Progress:** Before beginning work: `conductor_state.py set-todo <plan> <todo_id> in_progress`.

### TDD Iron Law

**No production code without a failing test first.** If implementation code was written before tests, delete it and start over from the failing test.

| Excuse | Reality |
| ------ | ------- |
| "Too simple to test" | Simple code breaks; a test takes seconds. |
| "I'll test after" | Tests that pass immediately prove nothing. |
| "Keep as reference" | Adapting pre-written code is testing after. Delete and rewrite. |

**Mandatory verify-red:** Run the test and confirm it fails for the *expected reason* (missing feature, not a typo). Do not proceed until red is verified.

**Mandatory verify-green:** Run the test and confirm pass with pristine output (no errors or warnings) before commit.

**Minimal implementation:** Write only enough code to pass the test. No extra features (YAGNI).

**Test quality:** Every test follows **Test Quality Rules** (`${CLAUDE_PLUGIN_ROOT}/templates/test-quality.md` in the Conductor plugin): behaviour through the public API, literal expectations, real objects or fakes before mocks, captured rather than invented fixtures, and no tautological tests. A test that would still pass with the change reverted does not count as the red step.

**One todo, one green commit.** A todo carries its own red → green cycle and lands as one commit with its tests. Red is verified inside the todo, not committed on its own (unless **Red commits** is `allowed` in **Working Agreements**). Todos come in two kinds:

| Kind | Rule |
| ---- | ---- |
| **Behaviour** (default) | A new or changed test fails before the change and passes after it. |
| **Refactor / prep** (`kind: refactor`) | Structure changes, behaviour does not: extracting a seam, threading a field through layers, renaming. Existing tests pass before and after; no new test is required. |

A slice that can neither fail a test before it nor pass as a pure refactor is not a todo on its own. Fold it into the todo whose test first makes it observable. A todo that changes a signature owns every call site, including generated bindings and the other side of any seam.

3. **Write Failing Tests (Red Phase)** *(behaviour todos)*:
   - Add or extend tests that define the expected behaviour and acceptance criteria for the task.
   - **CRITICAL:** Run the tests and confirm that they fail for the expected reason. This is the "Red" phase of TDD. Do not proceed until you have failing tests.
   - **Refactor todos:** run the existing tests and confirm they pass before changing anything.

4. **Implement to Pass Tests (Green Phase):**
   - Write the minimum amount of application code necessary to make the failing tests pass.
   - Run the test suite again and confirm that all tests now pass. This is the "Green" phase.

5. **Refactor (Optional but Recommended):**
   - With the safety of passing tests, refactor the implementation code and the test code to improve clarity, remove duplication, and enhance performance without changing the external behavior.
   - Rerun tests to ensure they still pass after refactoring.

6. **Verify Coverage:** Run coverage reports using the project's chosen tools. For example, in a Python project, this might look like:
   ```bash
   pytest --cov=app --cov-report=html
   ```
   Target: >80% coverage for new code. The specific tools and commands will vary by language and framework.

6b. **Independent Verification (risky todos):** When **Verifier** in **Working Agreements** is `per-todo`, or the todo is risky (it changes a public API or exported symbol, touches auth, security, secrets, or data migrations, or its diff exceeds ~150 lines), run the **Independent Verification Protocol** in templates/conductor-protocol.md before committing: a fresh subagent receives the todo, its plan section, the relevant acceptance criteria, the diff, and the test output, and returns `Approve` or `Reject`. On `Reject`, fix the numbered issues (increment the todo's `attempts`), re-verify; after 2 rejections escalate via the **User Prompt Protocol**. Other todos are covered by the per-phase verifier at the phase checkpoint.

   - **External blocker:** When a todo cannot proceed until something outside the repo happens (an upstream PR merges, access is granted), mark it `set-todo <plan> <id> blocked --on "<what>"`, tell the user in one line, and continue with other ready todos. The track stays `[~]` until the blocker clears.

7. **Document Deviations:** If the implementation has to differ from the plan, the spec, or the tech stack:
   - **STOP** implementation
   - Tech stack change: update `conductor/context/tech-stack.md` and add a dated note
   - Design change: update the spec requirement **and** rewrite every affected pending todo in the plan (content, files, body section) in the same step, so the next session does not follow stale instructions. Adding todos or a phase follows **Amending a plan** in the Plan Authoring Guide.
   - Resume implementation

8. **Commit Code Changes:**
   - Propose a clear, concise commit message e.g., `feat(ui): Create basic HTML structure for calculator`. It describes behaviour only; no track, plan, or todo ids (**Artifact Reference Policy** in templates/conductor-protocol.md).
   - **Gate on exit codes, not output.** Every configured test, lint, and typecheck command must exit 0 before the commit runs. Chain them so a failure stops the commit (`<test> && <lint> && git commit ...`); never decide by grepping output, since a pipeline that echoes "no FAIL" lets a failing commit through.
   - **Stage exactly the todo's files.** Use `git add <files>` with the todo's `files` list, never `git add -A` or `git add .`. Before committing, run `git status --porcelain` and stop on anything unexpected, especially secret-looking paths (`.env*`, `*.pem`, `*credentials*`, `*secret*`).
   - Follow **Commits** and **Commit approval** in **Working Agreements** and the **Git Write Policy**. With `Commits: user`, do not commit: record the todo as done with `(uncommitted)`, keep its file list, and hand over the commit at the phase checkpoint.

9. **Attach Task Summary with Git Notes:**
   - **Step 9.1: Get Commit Hash:** Obtain the hash of the *just-completed commit* (`git log -1 --format="%H"`). Skip if no commit was made.
   - **Step 9.2: Draft Note Content:** Create a detailed summary for the completed task. This should include what the task delivered in plain words, a summary of changes, a list of all created/modified files, and the core "why" for the change. No track, plan, or todo ids (**Artifact Reference Policy**).
   - **Step 9.3: Attach Note:** Write the note to a temporary file first so backticks and quotes survive the shell, then follow the **Git Write Policy** in templates/conductor-protocol.md before running:
     ```bash
     git notes add -F <note-file> <commit_hash>
     ```

10. **Get and Record Task Commit SHA:**
    - **Step 10.1: Update Plan:** `conductor_state.py set-todo <plan> <todo_id> completed --sha <first 7 chars>` (omit `--sha` when no commit was made).
    - **Step 10.2: Do it now,** before anything else. A plan that lags behind git makes the next session redo committed work.

11. **Plan commits:** Only when **Conductor files** is `committed`: plan updates are committed together at the phase checkpoint (`conductor(plan): Update progress for phase '<phase>'`), not after every todo. When `local`, there is nothing to commit.

12. **Keep going:** Unless **Autonomy** says to pause here, report progress in one line and start the next todo in the same turn. See **Keep-Going Rule** in the implement skill.

### Systematic Debugging Protocol

**Iron law:** No fixes without root-cause investigation first.

Use this protocol when tests fail, behavior is unexpected, or a fix attempt did not work. Do not guess.

**Phase 1 — Root cause:** Read error messages and stack traces fully. Reproduce consistently. Check recent changes (`git diff`, recent commits). Trace data flow to find where behavior diverges.

**Phase 2 — Pattern analysis:** Find similar working code in the repo. Compare differences between working and broken paths.

**Phase 3 — Hypothesis:** State one clear theory. Test it with the smallest possible change. One variable at a time.

**Phase 4 — Implementation:** Write a failing test that reproduces the bug (see **TDD Iron Law** above). Apply a single fix for the root cause. Verify tests pass.

**Budget:** Before each fix attempt, increment the todo's `attempts` in the plan frontmatter so the count survives an interrupted session (see **Convergence Budgets** in templates/conductor-protocol.md). Dedupe against previous attempts: do not retry a hypothesis already recorded.

**Escalation:** When `attempts` reaches **3**, stop and use the **User Prompt Protocol** to question the approach or architecture with the user. Do not attempt a fourth fix without discussion. Reset `attempts` to 0 when the todo completes.

### Phase Completion Verification and Checkpointing Protocol

**Trigger:** This protocol is executed immediately after a task is completed that also concludes a phase in the Conductor plan file.

1.  **Announce Protocol Start:** One line: "Phase '<name>' complete — running verification (task N/M)."

2.  **Ensure Test Coverage for Phase Changes:**
    -   **Step 2.1: Determine Phase Scope:** Find the previous phase's checkpoint SHA in the plan body (`[checkpoint: <sha>]`). If no previous checkpoint exists, the scope starts at the track's first commit.
    -   **Step 2.2: List Changed Files:** `git diff --name-only <previous_checkpoint_sha> HEAD`.
    -   **Step 2.3: Verify and Create Tests:** For each changed code file (skip `.json`, `.md`, `.yaml` and other non-code files), verify a corresponding test exists. If one is missing, write it, first matching the naming and style of the repo's existing tests. New tests must validate this phase's todos and follow **Test Quality Rules**.

3.  **Execute Automated Tests with Proactive Debugging:**
    -   Announce the exact command in one line, then run it. Example: "Tests: `CI=true npm test`".
    -   If tests fail, follow the **Systematic Debugging Protocol** above. Use **User Prompt Protocol** for final escalation if debugging stalls after 3 fix attempts.

4.  **Phase verifier:** Unless **Verifier** in **Working Agreements** is `off`, run the **Independent Verification Protocol** in templates/conductor-protocol.md once for the phase: the verifier receives `git diff <previous_checkpoint_sha>..HEAD`, the phase's todos and plan sections, the acceptance criteria they serve, and the test output. It looks for gaps between todos that each looked correct alone. **On the last phase of the track**, give it the whole track diff (`git diff <track_start>..HEAD`) and every acceptance criterion, and ask it how the requirements interact: defects in these sessions sat at seams between phases that each passed. On `Reject`, append fix todos to this phase (step 7) and run them before continuing.

5.  **Agent-run checks:** Run every check you can run yourself and paste the result: build the artefact, run the CLI, call the local endpoint, run `terraform plan` in the repo's test harness, and so on. Never hand the user a test, lint, or build command as "manual verification".

6.  **Hand check (only when a person is needed):**
    -   **Is one needed?** Follow **Manual verification** in **Working Agreements** (default `user-visible`). A hand check is needed only when the phase changed something a person has to see, click, or judge in the running product, or needs credentials or an environment you cannot reach. Otherwise say so in one line ("Nothing to check by hand this phase: <why>."), then go to step 8.
    -   **Pre-flight:** Before presenting steps, make sure the user will test the current code: the artefact they will run was built after the phase's last commit, and no stale instance is running. State both in one line. Follow **Verification runtime** in **Working Agreements** for who launches the app; never leave a long-running process of your own behind.
    -   **Steps:** Numbered actions in the running product and what to expect: "Click **Deploy** on the `dev` row → a toast shows the operation id." If a behaviour cannot be reached by clicking, add a temporary control for it or say how to reach it; never ask for console snippets.
    -   **Ask in plain chat,** not through a structured prompt tool, so the user can reply with free text and screenshots: "Reply **yes**, describe what's wrong, or say **later** to defer this check."
    -   **PAUSE** for the reply.

7.  **Handle the reply:**
    -   **yes:** continue to step 8.
    -   **Defects reported:** Each defect in this phase's scope becomes a new todo appended to the phase (`id: fix-<phase>-<n>`, `phase: <phase>`, `files`, content describing the defect). Run them through the normal task workflow. Out-of-scope requests go to **Backlog** with one line each. Then re-verify: show only the steps that failed. Never fix defects "off the books" while the verify todo sits `in_progress`.
    -   **later / park:** Set the phase's verify todo to `status: deferred`, keep the steps in its plan body section under **Deferred check**, and continue. A deferred check blocks nothing, but status lists it, the track is reported "complete, unverified" until it is done, and archive warns before archiving it.

8.  **Checkpoint:** Never create an empty checkpoint commit. The checkpoint is the phase's last commit (`HEAD`). With **Commits** `user`, first hand over the phase's commit(s): the message, the exact `git add` file list, and wait for "committed"; then read `git log` and record each todo's SHA.

9.  **Verification report as a git note:** Write the report (test command and result, agent-run checks, hand-check steps and the user's reply, or why none was needed) to a temporary file, then follow **Commit approval** and the **Git Write Policy** before running `git notes add -F <note-file> HEAD`. Skip when **Commits** is `user`.

10. **Record the checkpoint:** Append `[checkpoint: <sha>]` (first 7 characters of `HEAD`) to the phase heading in the plan body and mark the verify todo `completed` (or `deferred`). When **Conductor files** is `committed`, commit the plan updates for this phase now (`conductor(plan): Update progress for phase '<phase>'`).

11. **Announce and continue:** One line: phase done, checkpoint SHA, what now works. Then follow **Autonomy** in **Working Agreements**: with `until-needed`, start the next phase in the same turn; with `phase`, stop here. On a long track (more than ~20 todos) where this session has already been compacted, add one line suggesting `/conductor:conductor-handoff` before the next phase: a fresh session costs less than a second compaction.

### Quality Gates

Before marking any task complete, verify:

- [ ] All tests pass
- [ ] Code coverage meets requirements (>80%)
- [ ] Code follows project's code style guidelines (as defined in `conductor/context/code_styleguides/`)
- [ ] All public functions/methods are documented (e.g., docstrings, JSDoc, GoDoc)
- [ ] Type safety is enforced (e.g., type hints, TypeScript types, Go types)
- [ ] No linting or static analysis errors (using the project's configured tools)
- [ ] Works correctly on mobile (if applicable)
- [ ] Documentation updated if needed
- [ ] No security vulnerabilities introduced

## Agent Skills

Installed skills this project uses, and when to load them. Setup fills this in; edit it freely.

| Skill | Load when |
| ----- | --------- |
| _(none yet)_ | |

## Development Commands

**AI AGENT INSTRUCTION: This section should be adapted to the project's specific language, framework, and build tools.**

### Setup
```bash
# Example: Commands to set up the development environment (e.g., install dependencies, configure database)
# e.g., for a Node.js project: npm install
# e.g., for a Go project: go mod tidy
```

### Daily Development
```bash
# Example: Commands for common daily tasks (e.g., start dev server, run tests, lint, format)
# e.g., for a Node.js project: npm run dev, npm test, npm run lint
# e.g., for a Go project: go run main.go, go test ./..., go fmt ./...
```

### Before Committing
```bash
# Example: Commands to run all pre-commit checks (e.g., format, lint, type check, run tests)
# e.g., for a Node.js project: npm run check
# e.g., for a Go project: make check (if a Makefile exists)
```

## Testing Requirements

### Unit Testing
- Every module must have corresponding tests.
- Use appropriate test setup/teardown mechanisms (e.g., fixtures, beforeEach/afterEach).
- Mock external dependencies.
- Test both success and failure cases.

### Integration Testing
- Test complete user flows
- Verify database transactions
- Test authentication and authorization
- Check form submissions

### Mobile Testing
- Test on actual iPhone when possible
- Use Safari developer tools
- Test touch interactions
- Verify responsive layouts
- Check performance on 3G/4G

## Code Review Process

### Self-Review Checklist
Before requesting review:

1. **Functionality**
   - Feature works as specified
   - Edge cases handled
   - Error messages are user-friendly

2. **Code Quality**
   - Follows style guide
   - DRY principle applied
   - Clear variable/function names
   - Appropriate comments

3. **Testing**
   - Unit tests comprehensive
   - Integration tests pass
   - Coverage adequate (>80%)

4. **Security**
   - No hardcoded secrets
   - Input validation present
   - SQL injection prevented
   - XSS protection in place

5. **Performance**
   - Database queries optimized
   - Images optimized
   - Caching implemented where needed

6. **Mobile Experience**
   - Touch targets adequate (44x44px)
   - Text readable without zooming
   - Performance acceptable on mobile
   - Interactions feel native

## Commit Guidelines

All commits require user approval per the **Git Write Policy** in templates/conductor-protocol.md.

### Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests
- `chore`: Maintenance tasks

### Examples
```bash
git commit -m "feat(auth): Add remember me functionality"
git commit -m "fix(posts): Correct excerpt generation for short posts"
git commit -m "test(comments): Add tests for emoji reaction limits"
git commit -m "style(mobile): Improve button touch targets"
```

## Definition of Done

A task is complete when:

1. All code implemented to specification
2. Unit tests written and passing
3. Code coverage meets project requirements
4. Documentation complete (if applicable)
5. Code passes all configured linting and static analysis checks
6. Works beautifully on mobile (if applicable)
7. Implementation notes added to the Conductor plan file
8. Changes committed with proper message
9. Git note with task summary attached to the commit

## Emergency Procedures

### Critical Bug in Production
1. Create hotfix branch from main
2. Write failing test for bug
3. Implement minimal fix
4. Test thoroughly including mobile
5. Deploy immediately
6. Document in the Conductor plan file

### Data Loss
1. Stop all write operations
2. Restore from latest backup
3. Verify data integrity
4. Document incident
5. Update backup procedures

### Security Breach
1. Rotate all secrets immediately
2. Review access logs
3. Patch vulnerability
4. Notify affected users (if any)
5. Document and update security procedures

## Deployment Workflow

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Coverage >80%
- [ ] No linting errors
- [ ] Mobile testing complete
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backup created

### Deployment Steps
1. Merge feature branch to main
2. Tag release with version
3. Push to deployment service
4. Run database migrations
5. Verify deployment
6. Test critical paths
7. Monitor for errors

### Post-Deployment
1. Monitor analytics
2. Check error logs
3. Gather user feedback
4. Plan next iteration

## Continuous Improvement

- Review workflow weekly
- Update based on pain points
- Document lessons learned
- Optimize for user happiness
- Keep things simple and maintainable
