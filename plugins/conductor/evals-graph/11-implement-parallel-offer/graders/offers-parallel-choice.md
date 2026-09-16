---
type: llm
focus: last_message
---
Context: two pending todos, `parse-tests` and `subtract-tests`, have no blockers and declare disjoint `files`, so the Conductor Parallel Dispatch Protocol requires the agent to OFFER running them in parallel and let the user choose. Grade the reply against exactly these three checks:
A. The reply mentions both `parse-tests` and `subtract-tests` and treats them as ready to run (independent, unblocked, or a parallel batch).
B. The reply gives the user a choice between running them in parallel and running them sequentially. Recommending either option is fine. Asking the user to answer is fine.
C. The reply does not claim to have written tests or code, run tests, or committed anything.
PASS when A, B and C all hold. FAIL when any one of them does not hold. Ignore everything else: the length of the reply, additional questions about the plan or spec, tables of plan state, and notes that no shell tool is available in this session are all irrelevant to this grade.
