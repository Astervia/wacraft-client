# Create Core Domain

Scaffold a new domain under `src/core/` using the project's standard
component-store-controller architecture.

Inputs:

- domain name
- entity fields
- whether realtime support is needed

Workflow:

1. Create the standard domain folders:
   - `controller/`
   - `entity/`
   - `model/`
   - `store/`
   - optional `gateway/`
2. Add the entity interface and any request or query models.
3. Register server endpoints.
4. Create the controller on top of `MainServerControllerService`.
5. Create the store as the mutable state owner for the domain.
6. Add a gateway only when the feature genuinely needs realtime behavior.
7. Keep `src/core/` free of `src/app/` imports.

Checks:

- file placement matches existing domains
- route or UI changes happen separately in `src/app/`
- workspace-aware domains reset correctly on workspace changes
