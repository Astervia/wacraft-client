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
- In `@for` loops, always track list items by a unique primitive identifier (e.g., `track item.id`) rather than object reference to optimize rendering diffs. When tracking unsaved or temporary entities, assign a unique identifier (e.g., `uuidv4()`) instead of an empty string to prevent rendering collisions.

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
- When adding `aria-label` attributes to elements in templates, always include `i18n-aria-label` to ensure the accessibility text can be translated.

## Accessibility

- When hiding native focus rings on interactive elements (e.g., using Tailwind's `focus:outline-none`), always provide an accessible fallback for keyboard navigation, such as `focus-visible:ring-2`.
- Always ensure icon-only interactive elements have proper `aria-label` attributes.

## Security

- Prevent XSS by using `DomSanitizer.sanitize(SecurityContext.URL, url)` instead of `bypassSecurityTrustUrl()` when handling user-supplied URLs. `bypassSecurityTrust*` only marks a value as trusted; it does not sanitize. Reserve it for verified internal values.
- Always pair `target="_blank"` with `rel="noopener noreferrer"` on external links to prevent reverse-tabnabbing.

## Verification

- For scoped code changes, prefer targeted checks first.
- Use `npm run lint` for repo linting when the changed surface justifies it.
- Use `npm run build` when route, template, i18n, or production wiring changed.
- Format changed files with Prettier rather than reformatting the whole repo.

## Performance

- Avoid using `.flat()` or array spread operators `[...iterable]` on Maps or large data structures to search for elements, as it causes massive temporary memory allocation overhead. Use `for...of` loops with early exits instead.
