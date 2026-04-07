# Create Page Component

Scaffold a new page component that follows this repository's Angular routing and
layout conventions.

Inputs:

- component name
- whether the page is protected
- whether the page is admin-only
- whether the page uses the sidebar layout

Workflow:

1. Generate the component with Angular CLI in `src/app/<component-name>/`.
2. Keep the component standalone and align imports with surrounding pages.
3. Use `SidebarLayoutComponent` for standard protected pages unless the route is
   explicitly layout-free.
4. Register the route in `src/app/app.routes.ts` and add a `RoutePath` entry.
5. Add guards in route order, with `userGuard` first when needed.
6. Add sidebar navigation only if the page belongs in the main nav.
7. Run formatting and any targeted verification needed for the new route.

Checks:

- selector, route path, and folder names are consistent
- imports are relative and match local conventions
- i18n markers are added only for static translatable text
