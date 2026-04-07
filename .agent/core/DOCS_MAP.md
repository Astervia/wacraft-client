# Docs Map

This repository does not currently have a large `docs/` tree. Use the following
files as the primary source of truth before making architectural assumptions.

## Primary References

- `README.md` - product scope, deployment modes, and i18n workflow
- `package.json` - available scripts and toolchain versions
- `angular.json` - Angular build, localization, and extraction config
- `src/app/app.routes.ts` - route ownership and access control

## Shared Runtime References

- `src/core/common/controller/main-server-controller.service.ts`
- `src/core/common/gateway/main-server-gateway.service.ts`
- `src/core/workspace/store/workspace-context.service.ts`
- `src/plugins/common/service/plugins-manager.service.ts`

## Domain Discovery

When working in a feature area:

1. Inspect the matching `src/app/<feature>/` page and shared UI.
2. Inspect the matching `src/core/<domain>/` controller, store, entity, and
   model files.
3. Check `ServerEndpoints` and `RoutePath` before adding new paths.
4. Verify whether workspace switching, policies, or i18n apply.

Optional helper:

- `.agent/tools/inspect-angular-surface.sh`
