---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

Put each question to me with the **AskUserQuestion** tool (the question dialog), not as chat text: one question per call, a short `header`, 2 to 4 options with a one-line description each, and your recommended answer as the first option with " (Recommended)" on its label and the reason in its description. Use `multiSelect` only when the answers genuinely combine. Only when the tool is unavailable, or the question is truly open-ended with no sensible options, ask in chat with numbered options.

- **Show what you ask about.** Put the subject in chat (the design, the trade-off, the code shape) before the call, or in the question itself. Your reasoning is invisible to me, so "Approve this shape?" without the shape on screen is asking blind.
- **Preview the code when options are code.** When the options are alternative shapes (an interface, a function signature, a module layout, a config, a data model), give each option a `preview` with a short snippet or ASCII sketch of that alternative, so I compare them side by side instead of from labels. Keep each preview to what differs, about 5 to 20 lines. Previews work on single-select questions only; leave them off plain preference questions.
- **An answer that is a question or a change request** gets handled first, in chat. Ask again only after that, and never as if it weren't said.
- **Hand checks stay in plain chat.** "Run it and tell me if it works" is never a dialog: I answer those with screenshots, logs and several problems at once.

Finding *facts* is your job, never mine. When a question needs a fact from the environment (filesystem, tools, etc.), look it up, or hand it to a sub-agent and don't block on it: only the questions that depend on that fact wait, so ask the next one meanwhile. The *decisions* are mine: put each one to me and wait for my answer.

We're done when every branch of the decision tree has been visited and nothing is left silently assumed. Do not act on it until I confirm we have reached a shared understanding.
