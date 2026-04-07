# Skill: Add Workspace Multi-Tenancy

Use this skill when adding a new workspace-scoped feature or repairing
workspace-switch behavior in an existing feature.

## Purpose

Keep workspace identity, request scoping, and local state reset behavior aligned
across UI, store, controller, and gateway layers.

## Inputs To Gather

Before editing, inspect:

- `src/core/workspace/store/workspace-context.service.ts`
- `src/core/common/controller/main-server-controller.service.ts`
- `src/core/common/gateway/main-server-gateway.service.ts`
- the relevant domain store and controller
- `src/app/common/workspace-switcher/` when the UI is involved

Optional helper:

- `.agent/tools/inspect-angular-surface.sh workspace`

## Workflow

1. Decide whether the task is infrastructure or feature-scoped.
2. Keep active-workspace storage centralized in `WorkspaceContextService`.
3. Reuse the shared controller and gateway base classes for request scoping.
4. Reset workspace-scoped store state on workspace changes.
5. Avoid duplicating workspace headers or params in leaf services.
6. Update route or sidebar behavior only if the feature exposes workspace
   selection or workspace-only pages.

## Done Criteria

- HTTP requests use the active workspace consistently
- WebSocket connections reconnect with the active workspace consistently
- workspace-scoped stores clear stale data on switch
- no duplicated workspace-selection logic is introduced
