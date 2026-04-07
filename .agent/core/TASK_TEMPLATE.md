# Task Template

Use this template for scoped implementation work in this repository.

## Goal

State the user-visible or architecture-visible outcome in one short paragraph.

## Constraints

- preserve Angular standalone patterns
- keep `app -> core` dependency direction
- keep workspace-aware behavior correct when the feature is workspace scoped
- update i18n, routing, or plugin wiring only when the task actually needs it

## Inputs To Gather

- relevant route definitions
- page components under `src/app/`
- matching domain code under `src/core/`
- shared base classes when the change affects HTTP, WebSocket, or auth flow

## Expected Output

1. Short implementation plan.
2. Concrete code changes.
3. Verification results.
4. Risks, limitations, or follow-up work.
