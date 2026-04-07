# Agent Workspace

This directory holds repo-local assets for agentic coding workflows in
`wacraft-client`.

## Layout

- `core/` - shared repository context, conventions, and task templates
- `prompts/` - reusable prompts for common implementation and review tasks
- `skills/` - narrow workflows for repeatable multi-step changes
- `tools/` - helper scripts for repository inspection

Keep this tree concise and repo-local so prompts and automation stay aligned
with the Angular codebase instead of drifting into generic advice.

## Default Usage

Start with the shared guidance in `core/` and the generic prompts in
`prompts/`:

- `core/CONVENTIONS.md` - implementation rules and working agreements
- `core/ARCHITECTURE_MAP.md` - where UI, domain, realtime, and plugin code live
- `core/DOCS_MAP.md` - broader repo context and key source files to inspect
- `core/TASK_TEMPLATE.md` - default task template for scoped coding work
- `prompts/implement-change.md` - default prompt for feature or refactor work
- `prompts/review-change.md` - default prompt for code review work

Use the more specific prompts and skills only when a task clearly matches one
of the existing workflows.

## Repository-Specific Guidance

This repo is an Angular frontend for a multi-tenant WhatsApp Cloud API platform.
Important patterns worth preserving:

- standalone Angular components under `src/app/`
- business logic and data access under `src/core/`
- controller and gateway base classes in `src/core/common/`
- workspace-aware HTTP and WebSocket wiring
- i18n extraction and localized production builds
- optional plugin loading under `src/plugins/`
