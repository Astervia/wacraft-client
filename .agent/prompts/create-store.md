# Create Store Service

Scaffold a mutable store service that coordinates UI state and controller calls.

Inputs:

- domain name
- whether CRUD, search, and pagination are needed

Workflow:

1. Create the store under `src/core/<domain>/store/`.
2. Inject the domain controller.
3. Add the minimum state needed:
   - collection arrays
   - id maps
   - loading flags
   - pagination flags
4. Keep remote fetching, optimistic updates, and normalization in the store.
5. Reset workspace-scoped state on workspace changes where applicable.

Checks:

- the store owns state and orchestration, not transport details
- components read from the store instead of recreating request logic
- caching and reset behavior match neighboring stores
