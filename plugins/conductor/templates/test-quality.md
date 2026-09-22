# Test Quality Rules

A test earns its place only if it fails when the behaviour is wrong. These rules come from Google's [Testing on the Toilet](https://testing.googleblog.com/) series; each links its source. Implement follows them while writing tests; verifiers and review use the checks at the end.

## Writing tests

1. **Test observable behaviour through the public API**, not private helpers or call sequences. Only setup should change when the implementation does. ([Test Behavior, Not Implementation](https://testing.googleblog.com/2013/08/testing-on-toilet-test-behavior-not.html), [Prefer Testing Public APIs](https://testing.googleblog.com/2015/01/testing-on-toilet-prefer-testing-public.html))
2. **One behaviour per test, named scenario plus outcome** (`rejects_expired_token`), not after the method. Calling the code again after an assertion is a second test. ([Test Behaviors, Not Methods](https://testing.googleblog.com/2014/04/testing-on-toilet-test-behaviors-not.html), [Keep Tests Focused](https://testing.googleblog.com/2018/06/testing-on-toilet-keep-tests-focused.html), [Writing Descriptive Test Names](https://testing.googleblog.com/2014/10/testing-on-toilet-writing-descriptive.html))
3. **Literal inputs, literal expected outputs.** No loops, conditionals, or computed expectations in a test body: a computed expectation passes when production has the same bug. ([Don't Put Logic in Tests](https://testing.googleblog.com/2014/07/testing-on-toilet-dont-put-logic-in.html))
4. **DAMP over DRY.** Keep each test's cause next to its effect, and pass the values that matter to builders explicitly instead of relying on helper defaults. Tests have no tests; a reader must be able to check one by reading it. ([Tests Too DRY? Make Them DAMP!](https://testing.googleblog.com/2019/12/testing-on-toilet-tests-too-dry-make.html), [Keep Cause and Effect Clear](https://testing.googleblog.com/2017/01/testing-on-toilet-keep-cause-and-effect.html), [Include Only Relevant Details](https://testing.googleblog.com/2023/10/include-only-relevant-details-in-tests.html))
5. **Distinct, non-default inputs**, so the code must consume them: `insert(7, 42)`, not `insert(1, 0)`, which passes against an `insert` that stores nothing. ([Choosing Values for Robust Tests](https://testing.googleblog.com/2026/06/choosing-values-for-robust-tests.html))
6. **Assert narrowly**: only the fields and arguments this behaviour decides, never whole objects. ([Prefer Narrow Assertions](https://testing.googleblog.com/2024/04/prefer-narrow-assertions-in-unit-tests.html), [Only Verify Relevant Method Arguments](https://testing.googleblog.com/2018/06/testing-on-toilet-only-verify-relevant.html))
7. **Actionable failures**: use matchers whose message locates the bug (`status NOT_FOUND: /path`), not a bare `false`. ([Test Failures Should Be Actionable](https://testing.googleblog.com/2024/05/test-failures-should-be-actionable.html))

## Test doubles

8. **Real implementation first, then a fake, then a mock.** A mock proves only that your code works if the dependency behaves exactly as stubbed. More than one or two mocked collaborators is a warning sign. ([Increase Test Fidelity By Avoiding Mocks](https://testing.googleblog.com/2024/02/increase-test-fidelity-by-avoiding-mocks.html), [Don't Overuse Mocks](https://testing.googleblog.com/2013/05/testing-on-toilet-dont-overuse-mocks.html))
9. **Don't mock types you don't own.** Use the owner's fake, or mock your own thin wrapper. Hard-coded assumptions about someone else's API go stale and keep passing. ([Don't Mock Types You Don't Own](https://testing.googleblog.com/2020/07/testing-on-toilet-dont-mock-types-you.html), [Exercise Service Call Contracts](https://testing.googleblog.com/2018/11/testing-on-toilet-exercise-service-call.html))
10. **Assert results and state.** Verify an interaction only when the interaction is the requirement, and then only state-changing calls. ([Testing State vs. Testing Interactions](https://testing.googleblog.com/2013/03/testing-on-toilet-testing-state-vs.html), [Only Verify State-Changing Method Calls](https://testing.googleblog.com/2017/12/testing-on-toilet-only-verify-state.html))

## Scope

11. **Small and hermetic**: no network, sleeps, real clock, shared paths, or order dependence. Use synchronisation, not `sleep`. ([Test Sizes](https://testing.googleblog.com/2010/12/test-sizes.html), [Sleeping != Synchronization](https://testing.googleblog.com/2008/08/tott-sleeping-synchronization.html))
12. **Smallest test that catches the bug.** End-to-end only for critical journeys. ([Just Say No to More End-to-End Tests](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html))
13. **Coverage finds gaps; it is not a target.** Flip a condition or delete a line in the new code and a test must fail. Don't write tests for logging or tuning constants: they become change detectors. ([Code Coverage Best Practices](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html), [Mutation Testing](https://testing.googleblog.com/2021/04/mutation-testing.html))

## No tautological tests

A test is tautological when its expected value comes from the same place as its actual value: the implementation, a stub's canned return, a shared constant, or the author's unchecked assumption. Correct and broken code pass it alike ("a derivative of the code under test": [Change-Detector Tests Considered Harmful](https://testing.googleblog.com/2015/01/testing-on-toilet-change-detector-tests.html)). Never write:

| Pattern | Example | Instead |
| ------- | ------- | ------- |
| Expected value computed with the production logic | `expect(total(cart)).toBe(cart.items.reduce(…))` | Hard-code the known answer: `1850` |
| A stub asserted to return what it was stubbed to return | stub `translate → "hola"`, assert `greet("hi") == "hola"` | A stub whose output depends on its input, or a fake ([Mockito Answer](https://testing.googleblog.com/2014/03/whenhow-to-use-mockito-answer.html)) |
| Fixture invented instead of captured | a hand-written API payload friendlier than what the platform sends | Capture a real response (**Contract probe** below) |
| Never seen red | written after the code, or still passing with the feature removed | Run it against the code without the change; watch it fail for the expected reason ([The Way of TDD](https://testing.googleblog.com/2026/03/the-way-of-tdd.html)) |
| Constant echoing itself | `assertEquals(600, Config.TIMEOUT_SECONDS)` | Test the behaviour the constant drives, or nothing |
| Testing the mock | `verify(p1).process(w); verify(p2).process(w)` mirroring the code | Assert the outcome |

## Contract probe

When a todo consumes an external API, CLI, or file format whose real payloads are not already captured in the repo, the plan puts a **read-only live capture** first (`PREREQUISITE:` probe todo) and saves it as testdata. Fixtures and asserted shapes come from that capture, with a comment naming where it came from ("captured from `alis clone --json`"). A fixture with no captured or cited source (proto, schema, official docs) is a defect. In real use, invented fixtures were the main source of defects that reached manual verification, while live probes caught wrong assumptions before any code was written.

## Checks for verifiers and reviewers

Ask each of these of a diff's tests; any "no" is a finding.

1. If the new production change were reverted, or a key line mutated, would a new test fail? Was it seen failing for the expected reason first?
2. Is every expected value a literal or an independently known fact, not derived from the code under test, its constants, or a stub?
3. Would the tests survive a behaviour-preserving refactor (renaming a private helper, adding an unrelated field)?
4. Does each test assert an outcome, not only that collaborators were called?
5. Is each double grounded in reality: a real implementation, an owner-maintained fake, or a captured response?
6. Can you tell scenario, cause, and effect from the test's name and body alone? Are the inputs distinct and non-default?
7. Is it hermetic and deterministic?
