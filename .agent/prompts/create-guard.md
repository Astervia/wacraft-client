# Create Guard

Scaffold a functional Angular route guard for this repository.

Inputs:

- guard name
- guard type
- target location under `auth/` or a domain folder

Workflow:

1. Generate a functional guard with Angular CLI.
2. Use `inject()` for dependencies.
3. Return `true` or a `UrlTree`, not imperative navigation.
4. Register the guard in `src/app/app.routes.ts` where it is actually used.
5. When combined with `userGuard`, keep `userGuard` first in the guard list.

Checks:

- redirect targets are valid route paths
- async preload behavior is explicit when the guard depends on store data
- the guard lives with the domain that owns the rule
