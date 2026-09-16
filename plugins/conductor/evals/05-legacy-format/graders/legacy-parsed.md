---
type: llm
focus: last_message
---
The reply is a Conductor status overview. The registry uses the older heading style (`## [~] Track: ...`) with no metadata.json. There is one track, "Scoped credentials and refresh validation for alis-build-iam", in progress. Its plan has 10 todos: 3 completed, the 4th (`phase-1-verify`, the P1 user manual verification) in progress, 6 pending. Check each claim:
1. The reply recognises the scoped-credentials / alis-build-iam track as the in-progress track. It does not say Conductor is not set up, and it does not say there are no tracks.
2. It reports completed progress as 3 of 10 (30 percent). Reporting 4 of 10 as completed is wrong.
3. It identifies the in-progress todo as `phase-1-verify` or the P1 identity-model verification, or reports the position as task 4 of 10.
4. The next action is `/conductor:conductor-implement`.
5. Format: the first line names a next action, then a short bullet-style status block that ends with a one-word verdict (On track, Behind, or Blocked). Extra bullets, a note that the helper script could not be run, or short observations about the files are all fine. Do not fail on bullet count, ordering, wording, or extra notes. Fail on format only if the reply is a long prose narrative with no status block, or has no verdict at all.
Pass only if all five hold.
