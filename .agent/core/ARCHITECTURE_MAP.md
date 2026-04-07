# Architecture Map

High-level orientation for the `wacraft-client` codebase.

## Entry Points

- `src/app/app.routes.ts` - route registry and `RoutePath` enum
- `src/environments/` - runtime environment selection
- `src/plugins/common/service/plugins-manager.service.ts` - plugin loading entry

## UI Layer

- `src/app/` - pages, layouts, and shared components
- `src/app/common/` - shared UI building blocks such as sidebar layout and
  workspace switcher
- route-level pages mostly sit directly under `src/app/<feature>/`

## Domain Layer

Most business domains live under `src/core/<domain>/` and commonly use:

- `controller/` - HTTP accessors
- `entity/` - entity interfaces
- `model/` - request and response shapes
- `store/` - mutable client-side state
- `gateway/` - WebSocket integrations when needed

Representative domains:

- `auth/` - auth services and guards
- `workspace/` - workspace state and switching
- `billing/`, `campaign/`, `message/`, `phone-config/`, `user/`, `webhook/`

## Shared Infrastructure

- `src/core/common/controller/main-server-controller.service.ts`
  workspace-aware Axios base class with auth, billing, and verification
  redirects
- `src/core/common/gateway/main-server-gateway.service.ts`
  workspace-aware WebSocket base class with reconnect and ping behavior
- `src/core/common/constant/server-endpoints.enum.ts`
  endpoint registry for controller and gateway path composition

## Plugin Surface

- `src/plugins/` - plugin code
- `src/plugins-config/` - generated plugin configuration
- `plugins-manager.service.ts` currently loads plugins synchronously

## Cross-Cutting Behaviors

- Workspace selection affects HTTP clients, WebSocket clients, and
  workspace-scoped stores.
- Billing and email-verification redirects are enforced in the shared
  controller base class.
- i18n resources live under `src/locale/`.
