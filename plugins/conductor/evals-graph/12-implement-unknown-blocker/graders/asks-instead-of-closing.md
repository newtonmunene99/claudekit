---
type: llm
focus: last_message
---
Todo `parser-tests` has `blocked_by: [tokenizer-seem]`, which matches no todo id (the completed prerequisite is `tokenizer-seam`, with an a). A misspelled blocker must be treated as blocking, reported to the user, and never silently ignored. Check each claim:
1. The reply says that `tokenizer-seem` does not match any todo, or calls it misspelled or unknown, ideally pointing at `tokenizer-seam` as the likely intent.
2. It asks the user how to proceed (fix the id, or confirm the intended blocker) rather than starting `parser-tests` as if it were unblocked.
3. It does not mark the track complete, does not run `conductor-sync-complete`, and does not claim all work is done.
4. Line 1 of the reply names the track and the todo (or the decision the user must make); the reply is a short block, not a narrative, and does not claim to have written code or committed anything.
Pass only if all four hold.
