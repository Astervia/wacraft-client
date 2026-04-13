# Conventions

Repository-wide implementation rules for `wacraft-client`.

## Architecture

- UI pages and reusable visual components live in `src/app/`.
- Business logic, entities, controllers, gateways, guards, and stores live in
  `src/core/`.
- Plugin-facing code lives in `src/plugins/` and `src/plugins-config/`.
- Keep dependency flow one way: `src/app/ -> src/core/`. Do not move UI concerns
  into `src/core/`.

## Angular Patterns

- Prefer standalone components and functional guards.
- Routes are defined centrally in `src/app/app.routes.ts` through `RoutePath`.
- Sidebar-backed pages usually compose `SidebarLayoutComponent`.
- Use `inject()` for dependency wiring when that matches surrounding code.
- Follow existing mutable-store patterns before introducing new reactive state
  primitives.

## Security

- Prevent XSS by using Angular's `DomSanitizer.sanitize(SecurityContext.URL, url)` on user-supplied URLs instead of `bypassSecurityTrustUrl()`, or use the `SafeUrlPipe` for safe URL sanitization.

## Data Flow

- Default flow is `Component -> Store -> Controller -> Backend`.
- Controllers extend `MainServerControllerService` for HTTP concerns.
- Realtime integrations extend `MainServerGatewayService`.
- Stores own local arrays, maps, loading flags, and orchestration.
- Workspace changes should clear workspace-scoped state.

## Multi-Tenancy

- `WorkspaceContextService` stores the active workspace id in local storage.
- HTTP requests may include `X-Workspace-ID`.
- WebSocket connections may include `workspace_id` in the query string.
- If a feature is workspace-scoped, verify store reset behavior when switching
  workspaces.

## Routing And Access Control

- Put `userGuard` first when chaining protected-route guards.
- Admin-only routes should pair `userGuard` with `adminGuard`.
- Auth and billing redirects are already handled centrally in
  `MainServerControllerService`.

## i18n

- Localized builds run through `ng build --localize`.
- Extract strings with `ng extract-i18n --output-path src/locale`.
- Preserve placeholders exactly in XLF files.
- Do not mark purely dynamic values as translatable.

## Verification

- For scoped code changes, prefer targeted checks first.
- Use `npm run lint` for repo linting when the changed surface justifies it.
- Use `npm run build` when route, template, i18n, or production wiring changed.
- Format changed files with Prettier rather than reformatting the whole repo.
