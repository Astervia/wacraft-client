# Add Workspace Multi-Tenancy

Add or extend workspace multi-tenancy support in this Angular client.

Use this when introducing a new workspace-scoped domain or when making an
existing store, controller, or gateway react to workspace switching.

Inputs:

- target domain
- current store reset behavior
- current HTTP and WebSocket integration points
- UI surface that needs workspace selection

Workflow:

1. Confirm whether the task is:
   - full workspace infrastructure work
   - adding workspace awareness to an existing feature
2. Keep `WorkspaceContextService` as the source of the active workspace id.
3. Route HTTP requests through `MainServerControllerService` so
   `X-Workspace-ID` stays centralized.
4. Route WebSocket connections through `MainServerGatewayService` so
   `workspace_id` stays centralized.
5. Clear workspace-scoped store state when the active workspace changes.
6. Add or update the workspace switcher UI only if the task touches user-facing
   workspace selection.

Checks:

- store state resets correctly on workspace change
- workspace-aware requests use the correct header or query param
- routes and guards still resolve after switching workspaces
