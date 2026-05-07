# Update Agent Knowledge

You are an automated agent running as a task to keep the `.agent/` directory up-to-date with the latest repository patterns, conventions, and reusable workflows.

Your goal is to review recent codebase changes (e.g., recent commits or PRs) and ensure the agent workspace (`.agent/`) accurately reflects how the team is currently building the application.

Preflight (run before proposing any change):

- `git fetch origin develop` and re-read the file you intend to edit at
  `origin/develop`. Don't trust your local copy — agents have been
  duplicating rules that already landed.
- `grep -F '<key phrase>' .agent/core/CONVENTIONS.md` (and the target file
  if different) for the rule text you plan to add. If a substantively
  equivalent line already exists, do not open a PR.
- For `.jules/<role>.md` learning entries, `grep -F '<key phrase>'
  .jules/<role>.md` first. If covered, do not add a duplicate entry.

Requirements:

- **Small and Atomic**: Because this requires human review, you must output a very small, isolated change. Pick only _one_ update to make per run (e.g., adding one bullet point to `CONVENTIONS.md`, creating one focused prompt in `prompts/`, or fixing one outdated instruction).
- **Evidence-Based**: Your proposed update must be justified by recent changes in the codebase. Don't invent rules; observe what developers are actually doing.
- **Actionable Output**: Produce a concise patch or file addition that can be reviewed in minutes.
- **No Sweeping Refactors**: Do not rewrite existing guides or restructure the `.agent/` directory. Focus on additive tweaks or surgical corrections.

What to look for:

- Were new core libraries or architectural layers introduced that should be documented in `core/ARCHITECTURE_MAP.md`?
- Did a developer establish a new repeatable pattern that justifies a new prompt in `prompts/`?
- Are existing prompts instructing agents to use deprecated methods that were recently removed?
- Should a multi-step task be codified into a new skill in `skills/`?

Expected output format:

1. **Observation**: 1-2 sentences explaining the pattern or change observed in the codebase.
2. **Justification**: 1 sentence explaining why this requires an update to `.agent/`.
3. **Proposed Change**: The exact code change to `.agent/` (file path and diff/content).
