---
type: llm
focus: last_message
---
The reply is a Conductor status overview of a project whose single track, lrocloud_20260909, is complete with all 16 todos done. Check each claim:
1. No track and no todo is reported as currently in progress ("none" is the expected answer).
2. No track is reported as eligible or blocked, and the reply does not tell the user to run `/conductor:conductor-implement` on lrocloud_20260909. Any sensible next action for a finished programme is fine: suggesting `/conductor:conductor-new-track`, saying nothing is left to implement, or similar.
3. Progress is reported as 16 of 16 (or 100 percent).
4. Format: the first line names a next action, then a short bullet-style status block that ends with a one-word verdict (On track, Behind, or Blocked). Extra bullets, a note that the helper script could not be run, or short observations about the files are all fine. Do not fail on bullet count, ordering, wording, or extra notes. Fail on format only if the reply is a long prose narrative with no status block, or has no verdict at all.
Pass only if all four hold.
