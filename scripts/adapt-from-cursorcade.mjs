#!/usr/bin/env node

// Re-port helper: rewrites cursorcade (Cursor) plugin text into claudekit (Claude Code) form.
// Replacement order matters: specific `~/.cursor/plugins/...` path rules must run before the
// global `.cursor/` artifact-dir rewrite, or they never match.

import { promises as fs } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const pluginsDir = path.join(repoRoot, "plugins");

const TEXT_EXTENSIONS = new Set([".md", ".mdc", ".markdown", ".txt"]);

function adaptContent(content, { isConductorSkill = false } = {}) {
  let text = content;

  // Cursor → Claude product references
  text = text.replace(/Cursor Plan Format/g, "Conductor Plan Format");
  text = text.replace(/Cursor-native plan/g, "Conductor plan");
  text = text.replace(/Cursor-native frontmatter/g, "Conductor plan frontmatter");
  text = text.replace(/Cursor plan file/g, "Conductor plan file");
  text = text.replace(/Cursor plan files/g, "Conductor plan files");
  text = text.replace(/Cursor UI may ignore unknown fields/g, "Claude Code may ignore unknown fields");
  text = text.replace(/directly in Cursor or via `\/conductor-/g, "directly in Claude Code or via `/conductor:conductor-");
  text = text.replace(/Runnable directly in Cursor/g, "Runnable directly in Claude Code");
  text = text.replace(/executing a plan directly in Cursor/g, "executing a plan directly in Claude Code");
  text = text.replace(/for Cursor/g, "for Claude Code");
  text = text.replace(/Cursor plugin/g, "Claude Code plugin");
  text = text.replace(/Cursor plugins/g, "Claude Code plugins");
  text = text.replace(/Cursorcade/g, "Claudekit");
  text = text.replace(/cursorcade/g, "claudekit");
  text = text.replace(/rules\/conductor\.mdc/g, "templates/conductor-protocol.md");
  text = text.replace(/the Conductor rule/g, "templates/conductor-protocol.md");

  // Slash command namespacing
  text = text.replace(/`\/conductor-setup`/g, "`/conductor:conductor-setup`");
  text = text.replace(/`\/conductor-new-track`/g, "`/conductor:conductor-new-track`");
  text = text.replace(/`\/conductor-implement`/g, "`/conductor:conductor-implement`");
  text = text.replace(/`\/conductor-status`/g, "`/conductor:conductor-status`");
  text = text.replace(/`\/conductor-revert`/g, "`/conductor:conductor-revert`");
  text = text.replace(/`\/conductor-review`/g, "`/conductor:conductor-review`");
  text = text.replace(/`\/conductor-programme-review`/g, "`/conductor:conductor-programme-review`");
  text = text.replace(/`\/conductor-validate-review`/g, "`/conductor:conductor-validate-review`");
  text = text.replace(/`\/conductor-prototype`/g, "`/conductor:conductor-prototype`");
  text = text.replace(/`\/grilling`/g, "`/engineering:grilling`");
  text = text.replace(/`\/research`/g, "`/engineering:research`");
  text = text.replace(/`\/prototype`/g, "`/engineering:prototype`");
  text = text.replace(/`\/grill-with-docs`/g, "`/engineering:grill-with-docs`");
  text = text.replace(/`\/improve-codebase-architecture`/g, "`/engineering:improve-codebase-architecture`");

  // Template path resolution — must run before the global `.cursor/` rewrite below
  text = text.replace(
    /Locate installed plugin templates in this order:\s*\n1\. `~\/\.cursor\/plugins\/local\/conductor\/templates\/`\s*\n2\. Search `~\/\.cursor\/plugins\/cache\/` for the conductor plugin `templates\/` directory\s*\n3\. Fallback \(marketplace dev\): `\.\/plugins\/conductor\/templates\/` from repo root/g,
    "Locate plugin templates in this order:\n1. `${CLAUDE_PLUGIN_ROOT}/templates/`\n2. Fallback (local dev): `./plugins/conductor/templates/` from claudekit repo root"
  );
  text = text.replace(
    /1\. `~\/\.cursor\/plugins\/local\/conductor\/templates\/`\s*\n2\. Search `~\/\.cursor\/plugins\/cache\/` for (?:the conductor plugin `templates\/` directory|conductor `templates\/`)/g,
    "1. `${CLAUDE_PLUGIN_ROOT}/templates/`\n2. Fallback (local dev): `./plugins/conductor/templates/` from claudekit repo root"
  );
  text = text.replace(
    /\*\*Conductor:\*\* `~\/\.cursor\/plugins\/local\/conductor\/templates\/` → cache → `\.\/plugins\/conductor\/templates\/`/g,
    "**Conductor:** `${CLAUDE_PLUGIN_ROOT}/templates/` → fallback `./plugins/conductor/templates/`"
  );
  text = text.replace(
    /\*\*Engineering prototype:\*\* `~\/\.cursor\/plugins\/local\/engineering\/skills\/prototype\/` → cache → `\.\/plugins\/engineering\/skills\/prototype\/`/g,
    "**Engineering prototype:** the `LOGIC.md` / `UI.md` spike-shape docs live in the **engineering plugin**, not this one. Resolve in order:\n\n1. `${CLAUDE_PLUGIN_ROOT}/../engineering/skills/prototype/` (both plugins installed from the claudekit marketplace)\n2. Fallback (local dev): `./plugins/engineering/skills/prototype/` from claudekit repo root\n3. Neither found: follow the inline spike rules in §2.4"
  );
  text = text.replace(/~\/\.cursor\/plugins\/local\/conductor\/templates\//g, "${CLAUDE_PLUGIN_ROOT}/templates/");
  text = text.replace(/~\/\.cursor\/plugins\/local\/engineering\/skills\/prototype\//g, "${CLAUDE_PLUGIN_ROOT}/../engineering/skills/prototype/");
  text = text.replace(/Search `~\/\.cursor\/plugins\/cache\/`[^\n]*/g, "Fallback: `./plugins/conductor/templates/` from claudekit repo root");

  // Cursor rules dir → Claude rules dir (also before the global artifact rewrite)
  text = text.replace(/\.cursor\/rules\//g, ".claude/rules/");

  // Artifact paths — everything left under `.cursor/` is a project artifact
  text = text.replace(/\.cursor\//g, "conductor/");

  // Tool mapping sections
  text = text.replace(
    /## Cursor Tool Mapping\s*\n\s*- \*\*AskQuestion\*\* for structured user prompts \(replaces Gemini `ask_user`\)\s*\n- \*\*Write\*\* \/ \*\*StrReplace\*\* for file operations \(replaces `write_file` \/ `replace`\)\s*\n- \*\*Shell\*\* for shell commands \(replaces `run_shell_command`\)\s*\n- Use relative paths under `conductor\/` for all Conductor artifacts/g,
    "## Claude Tool Mapping\n\n- **User Prompt Protocol** for structured user prompts (AskUserQuestion tool when available, else numbered options in chat; wait for reply)\n- **Read** / **Write** / **Edit** for file operations\n- **Bash** for shell commands\n- **Grep** / **Glob** for search\n- Use relative paths under `conductor/` for all Conductor artifacts"
  );

  // AskQuestion → User Prompt Protocol
  text = text.replace(/call `AskQuestion`/gi, "use the **User Prompt Protocol**");
  text = text.replace(/call the `AskQuestion` tool/gi, "use the **User Prompt Protocol**");
  text = text.replace(/immediately call the `AskQuestion` tool/gi, "immediately use the **User Prompt Protocol**");
  text = text.replace(/[Uu]se the `AskQuestion` tool/g, "use the **User Prompt Protocol**");
  text = text.replace(/using the `AskQuestion` tool/g, "using the **User Prompt Protocol**");
  text = text.replace(/via `AskQuestion`/g, "via the **User Prompt Protocol**");
  text = text.replace(/`AskQuestion` `choice`/g, "**User Prompt Protocol** (numbered choice list)");
  text = text.replace(/`AskQuestion` `yesno`/g, "**User Prompt Protocol** (yes/no prompt)");
  text = text.replace(/`AskQuestion` `text`/g, "**User Prompt Protocol** (free-text prompt)");
  text = text.replace(/`AskQuestion`/g, "**User Prompt Protocol**");
  text = text.replace(/AskQuestion/g, "User Prompt Protocol");

  // i-have-adhd removal — multi-line blocks first, then drop any whole remaining line
  // (a trailing-fragment regex like /i-have-adhd[^\n]*/ would truncate lines mid-sentence)
  text = text.replace(
    /\*\*Base rules:\*\* Resolve the \*\*i-have-adhd\*\* skill from the Claudekit \*\*i-have-adhd\*\* plugin \(`skills\/i-have-adhd\/SKILL\.md`\) when installed\. If not installed, apply the summary below\.\s*\n\s*\n/g,
    ""
  );
  text = text.replace(
    /Conductor-specific output formats\. \*\*Base rules\*\* \(action first, numbered steps, restate state, no preamble\/closers, etc\.\) live in the \*\*\[i-have-adhd\][^\n]+\n\nIf \*\*i-have-adhd\*\* is not installed, apply the \*\*Agent Output Style\*\* summary in templates\/conductor-protocol\.md\.\s*\n\s*Run `\/i-have-adhd` once per session for session-wide formatting on non-Conductor work too\.\s*\n\s*\n/g,
    "Conductor-specific output formats. **Base rules** (action first, numbered steps, restate state, no preamble/closers) are defined in templates/conductor-protocol.md.\n\n"
  );
  text = text.replace(/Install both plugins from the marketplace[^\n]*\n?/g, "");
  text = text.replace(/^.*i-have-adhd.*$\n?/gm, "");

  if (isConductorSkill && text.startsWith("---\n")) {
    const closing = text.indexOf("\n---\n", 4);
    if (closing !== -1) {
      const frontmatter = text.slice(4, closing);
      const body = text.slice(closing + 5);
      let fm = frontmatter;
      if (!fm.includes("disable-model-invocation:")) {
        fm = fm.trimEnd() + "\ndisable-model-invocation: true";
      }
      if (!body.includes("conductor-protocol.md")) {
        text = `---\n${fm}\n---\n\nFollow \`${"${CLAUDE_PLUGIN_ROOT}"}/templates/conductor-protocol.md\` for file resolution, git policy, and output style.\n\n${body.trimStart()}`;
      } else {
        text = `---\n${fm}\n---\n${body}`;
      }
    }
  }

  return text;
}

async function walkFiles(dirPath) {
  const files = [];
  const stack = [dirPath];
  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git") continue;
        stack.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }
  return files;
}

async function main() {
  const files = await walkFiles(pluginsDir);
  let count = 0;
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    const isConductorSkill = file.includes("/conductor/skills/") && path.basename(file) === "SKILL.md";
    const original = await fs.readFile(file, "utf8");
    const adapted = adaptContent(original, { isConductorSkill });
    if (adapted !== original) {
      await fs.writeFile(file, adapted);
      count++;
    }
  }
  console.log(`Adapted ${count} files under plugins/`);
}

await main();
