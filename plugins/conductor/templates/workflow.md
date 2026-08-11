# Project Workflow

## Agent Messages During Implementation

Follow **Agent Output Style** in templates/conductor-protocol.md (**

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

1. **Select Task:** Choose the next available todo from the Conductor plan file (`conductor/plans/*.plan.md`) in sequential order

2. **Mark In Progress:** Before beginning work, update the plan frontmatter: set the todo's `status` to `in_progress`

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

3. **Write Failing Tests (Red Phase):**
   - Create a new test file for the feature or bug fix.
   - Write one or more unit tests that clearly define the expected behavior and acceptance criteria for the task.
   - **CRITICAL:** Run the tests and confirm that they fail as expected. This is the "Red" phase of TDD. Do not proceed until you have failing tests.

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

7. **Document Deviations:** If implementation differs from tech stack:
   - **STOP** implementation
   - Update `conductor/context/tech-stack.md` with new design
   - Add dated note explaining the change
   - Resume implementation

8. **Commit Code Changes:**
   - Propose a clear, concise commit message e.g., `feat(ui): Create basic HTML structure for calculator`.
   - Follow the **Git Write Policy** in templates/conductor-protocol.md before staging and committing. Suggested commands: `git add <files>` then `git commit -m "<message>"`.

9. **Attach Task Summary with Git Notes:**
   - **Step 9.1: Get Commit Hash:** Obtain the hash of the *just-completed commit* (`git log -1 --format="%H"`). Skip if no commit was made.
   - **Step 9.2: Draft Note Content:** Create a detailed summary for the completed task. This should include the task name, a summary of changes, a list of all created/modified files, and the core "why" for the change.
   - **Step 9.3: Attach Note:** Follow the **Git Write Policy** in templates/conductor-protocol.md before running:
     ```bash
     git notes add -m "<note content>" <commit_hash>
     ```

10. **Get and Record Task Commit SHA:**
    - **Step 10.1: Update Plan:** Read the Conductor plan file, find the completed todo, set `status` to `completed`, and append the first 7 characters of the commit hash to `content` (if a commit was made; otherwise omit the SHA).
    - **Step 10.2: Write Plan:** Write the updated content back to the plan file.

11. **Commit Plan Update:**
    - **Action:** Follow the **Git Write Policy** in templates/conductor-protocol.md before staging and committing the modified plan file. Suggested message: `conductor(plan): Mark task 'Create user model' as complete`.

### Systematic Debugging Protocol

**Iron law:** No fixes without root-cause investigation first.

Use this protocol when tests fail, behavior is unexpected, or a fix attempt did not work. Do not guess.

**Phase 1 — Root cause:** Read error messages and stack traces fully. Reproduce consistently. Check recent changes (`git diff`, recent commits). Trace data flow to find where behavior diverges.

**Phase 2 — Pattern analysis:** Find similar working code in the repo. Compare differences between working and broken paths.

**Phase 3 — Hypothesis:** State one clear theory. Test it with the smallest possible change. One variable at a time.

**Phase 4 — Implementation:** Write a failing test that reproduces the bug (see **TDD Iron Law** above). Apply a single fix for the root cause. Verify tests pass.

**Escalation:** After **3 failed fix attempts**, stop and use the **User Prompt Protocol** to question the approach or architecture with the user. Do not attempt a fourth fix without discussion.

### Phase Completion Verification and Checkpointing Protocol

**Trigger:** This protocol is executed immediately after a task is completed that also concludes a phase in the Conductor plan file.

1.  **Announce Protocol Start:** One line: "Phase '<name>' complete — running verification (task N/M)."

2.  **Ensure Test Coverage for Phase Changes:**
    -   **Step 2.1: Determine Phase Scope:** To identify the files changed in this phase, you must first find the starting point. Read the Conductor plan file to find the Git commit SHA of the *previous* phase's checkpoint. If no previous checkpoint exists, the scope is all changes since the first commit.
    -   **Step 2.2: List Changed Files:** Execute `git diff --name-only <previous_checkpoint_sha> HEAD` to get a precise list of all files modified during this phase.
    -   **Step 2.3: Verify and Create Tests:** For each file in the list:
        -   **CRITICAL:** First, check its extension. Exclude non-code files (e.g., `.json`, `.md`, `.yaml`).
        -   For each remaining code file, verify a corresponding test file exists.
        -   If a test file is missing, you **must** create one. Before writing the test, **first, analyze other test files in the repository to determine the correct naming convention and testing style.** The new tests **must** validate the functionality described in this phase's todos in the Conductor plan file.

3.  **Execute Automated Tests with Proactive Debugging:**
    -   Before execution, you **must** announce the exact shell command you will use to run the tests.
    -   **Example Announcement:** "I will now run the automated test suite to verify the phase. **Command:** `CI=true npm test`"
    -   Execute the announced command.
    -   If tests fail, follow the **Systematic Debugging Protocol** above. Use **User Prompt Protocol** for final escalation if debugging stalls after 3 fix attempts.

4.  **Propose a Detailed, Actionable Manual Verification Plan:**
    -   **CRITICAL:** To generate the plan, first analyze `conductor/context/product.md`, `conductor/context/product-guidelines.md`, and the Conductor plan file to determine the user-facing goals of the completed phase.
    -   You **must** generate a step-by-step plan that walks the user through the verification process, including any necessary commands and specific, expected outcomes.
    -   The plan you present to the user **must** follow this format:

        **For a Frontend Change:**
        ```
        The automated tests have passed. For manual verification, please follow these steps:

        **Manual Verification Steps:**
        1.  **Start the development server with the command:** `npm run dev`
        2.  **Open your browser to:** `http://localhost:3000`
        3.  **Confirm that you see:** The new user profile page, with the user's name and email displayed correctly.
        ```

        **For a Backend Change:**
        ```
        The automated tests have passed. For manual verification, please follow these steps:

        **Manual Verification Steps:**
        1.  **Ensure the server is running.**
        2.  **Execute the following command in your terminal:** `curl -X POST http://localhost:8080/api/v1/users -d '{"name": "test"}'`
        3.  **Confirm that you receive:** A JSON response with a status of `201 Created`.
        ```

5.  **Await Explicit User Feedback:**
    -   After presenting the detailed plan, ask the user for confirmation: "**Does this meet your expectations? Please confirm with yes or provide feedback on what needs to be changed.**"
    -   **PAUSE** and await the user's response. Do not proceed without an explicit yes or confirmation.

6.  **Create Checkpoint Commit:**
    -   Follow the **Git Write Policy** in templates/conductor-protocol.md before staging and committing. Suggested message: `conductor(checkpoint): Checkpoint end of Phase X`. Skip if the user declines and no commit is needed.

7.  **Attach Auditable Verification Report using Git Notes:**
    -   **Step 7.1: Draft Note Content:** Create a detailed verification report including the automated test command, the manual verification steps, and the user's confirmation.
    -   **Step 7.2: Attach Note:** Follow the **Git Write Policy** in templates/conductor-protocol.md before running `git notes add` on the checkpoint commit.

8.  **Get and Record Phase Checkpoint SHA:**
    -   **Step 8.1: Get Commit Hash:** Obtain the hash of the *just-created checkpoint commit* (`git log -1 --format="%H"`). Skip if no checkpoint commit was made.
    -   **Step 8.2: Update Plan:** Read the Conductor plan file, find the heading for the completed phase in the markdown body, and append the first 7 characters of the commit hash in the format `[checkpoint: <sha>]` (if available).
    -   **Step 8.3: Write Plan:** Write the updated content back to the plan file.

9. **Commit Plan Update:**
    - **Action:** Follow the **Git Write Policy** in templates/conductor-protocol.md before staging and committing the modified plan file. Suggested message: `conductor(plan): Mark phase '<PHASE NAME>' as complete`.

10.  **Announce Completion:** Inform the user that the phase is complete and the checkpoint has been created, with the detailed verification report attached as a git note.

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
