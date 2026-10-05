---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

Finding *facts* is your job, never mine. When a question needs a fact from the environment (filesystem, tools, etc.), look it up, or hand it to a sub-agent and don't block on it: only the questions that depend on that fact wait, so ask the next one meanwhile. The *decisions* are mine: put each one to me and wait for my answer.

We're done when every branch of the decision tree has been visited and nothing is left silently assumed. Do not act on it until I confirm we have reached a shared understanding.
