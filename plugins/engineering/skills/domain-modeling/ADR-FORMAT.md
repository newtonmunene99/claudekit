# OKF Decision Concepts

Replaces numbered ADRs in `docs/adr/`. See [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

## Where decisions live

In `.adr/decisions/<slug>.md` (concept ID `decisions/<slug>`), the local decision bundle at the repo root. `.adr/` holds a `.gitignore` with `*`, so nothing in it is committed unless the user asks (`git add -f <path>`). Create it lazily, `.gitignore` first. A decision about one package carries `scope: <pkg path>` in its frontmatter.
