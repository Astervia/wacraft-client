# Create Controller Service

Scaffold a controller that extends `MainServerControllerService`.

Inputs:

- domain name
- endpoint path
- required CRUD or query methods

Workflow:

1. Add the endpoint to `src/core/common/constant/server-endpoints.enum.ts`.
2. Ensure the domain entity and any request models exist.
3. Create `src/core/<domain>/controller/<domain>-controller.service.ts`.
4. Extend `MainServerControllerService`, call `setPath(...)`, then `setHttp()`.
5. Return raw response data from controller methods.
6. Use `requestWithoutWorkspace()` only for endpoints that must bypass workspace
   scoping.

Checks:

- controller logic stays transport-focused
- state management stays in the store layer
- shared auth, billing, and workspace behavior remains centralized
