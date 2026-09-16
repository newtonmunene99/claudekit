# conductor-status eval suite

Seven cases for the `conductor-status` skill. Fixtures are trimmed from a real
project (python-alis-build) and mutated to cover: all complete, mid-track,
programme with a blocked track, two parallel-ready tracks, the legacy
`## [ ] Track:` registry format, an empty sandbox, and one should-not-fire
question.

## Run

```bash
# full suite, 3 runs per case, both arms; headline is Δ (with minus without)
claude plugin eval . --ablation with-without --judge-model sonnet --allow-tools Write

# keep the report local
claude plugin eval . --ablation with-without --judge-model sonnet --allow-tools Write --no-publish

# on a machine whose Bash sandbox works, also exercise scripts/conductor_state.py
claude plugin eval . --ablation with-without --judge-model sonnet --allow-tools Write "Bash(python3:*)"
```

## Things to know

- Every Conductor skill has `disable-model-invocation: true`, so the skill only
  fires when the prompt starts with `/conductor:conductor-status`. The baseline
  arm therefore sees "Unknown command" and scores 0 at no cost; Δ equals the
  with-arm score for those cases.
- Cases run in an empty sandbox. Each prompt carries its fixture files inline
  and asks the agent to write them first, which is why `Write` must be granted
  with `--allow-tools`. `allowed_tools` in prompt.md alone is not a grant.
- A Bash grant is refused on machines where `~/.docker` contains symlinks
  (Docker Desktop's default layout). Without Bash the skill takes its documented
  hand-count fallback; the outcome graders score that path correctly, but the
  state script itself is not exercised.
- A `tool_used: Skill` grader always reads 0 for slash-expanded skills, so none
  is used here. Trigger evidence is the output shape and the baseline's
  "Unknown command".
- Fixtures must be internally consistent (spec stubs present, no dependency on
  an unregistered track). The model reports inconsistencies, which bloats the
  reply and trips the judge.
- Judge rubrics are checklists that say explicitly what not to fail on. A bare
  "keep it short" line makes the judge fail long-but-correct replies.
