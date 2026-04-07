# Implement Change

Implement a scoped change in `wacraft-client`.

Requirements:

- Trace the current behavior before editing.
- Pull context from `README.md`, `.agent/core/`, and the relevant source files
  before inventing new patterns.
- Change the smallest reasonable surface that solves the task.
- Keep `src/app/` and `src/core/` responsibilities separated.
- Preserve workspace-aware behavior where applicable.
- Add or update tests when the changed behavior is covered by the existing test
  setup.
- Update docs or prompts when the repository workflow changes materially.

Repository-specific guidance:

- Routes are centralized in `src/app/app.routes.ts`.
- Shared HTTP and redirect behavior lives in
  `src/core/common/controller/main-server-controller.service.ts`.
- Shared WebSocket behavior lives in
  `src/core/common/gateway/main-server-gateway.service.ts`.
- Stores are mutable services and often reset on workspace changes.
- Translation-sensitive template work should check `src/locale/`.

Expected output:

1. Short implementation plan.
2. Concrete code changes.
3. Verification results.
4. Risks, limitations, and follow-up work.
