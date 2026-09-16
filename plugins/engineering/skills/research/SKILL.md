---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

Run research as a small graph, not one long read: scope, fan out, dedupe, draft, check, then hand the user a cited file. Keep it all in the background so you keep working while it runs.

## 1. Scope (you, in this context)

One line each, written down before any agent starts:

- **Question** — the exact thing to answer.
- **Audience** — who reads the file and what decision it feeds.
- **Done when** — the completion test (e.g. "each of the three options has a cited quota limit and a cited pricing line").

If the question splits into independent lanes (different products, different versions, different sub-questions), list them. Two to four lanes is typical; if there is only one lane, run one agent and skip the join.

## 2. Fan out (background agents, one per lane)

Each lane agent gets the same contract:

1. Investigate **primary sources only** — official docs, source code, specs, first-party APIs — not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Return a **structured result**, not prose: a list of `{claim, source URL or file path, quote or line ref, confidence}`. Also return `open_questions` for anything it could not source.
3. Stay inside its lane. It does not answer the other lanes' questions.

Lanes share nothing while running, so one lane failing (paywall, dead docs, tool error) never blocks the others. Report a failed lane as a gap; do not retry it more than once without asking.

## 3. Join and dedupe (you, deterministically)

Merge the lane results. Drop duplicate claims (same source, same fact). Where two lanes disagree, keep both with their sources and mark the conflict; do not pick a winner by intuition.

## 4. Draft (one agent, or you)

Write the findings file **from the merged claims only**. Every sentence with a fact cites its claim's source. Unsourced material goes under **Open questions**, never in the body.

## 5. Check (a fresh agent, read-only)

Give a fresh agent the draft plus the merged claim list. It verifies: every cited claim exists in the list, every URL resolves to the quoted content, the **Done when** test is met, and no section is empty. It returns `Approve` or `Reject` with numbered issues. On `Reject`, fix only the named issues and re-check once; after that, surface the remaining issues to the user instead of looping.

## 6. Deliver

Save the file where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where. Tell the user the path, the lanes that ran, and any gaps or conflicts in one short list.
