# Review Change

Review a change in `wacraft-client`.

Priorities:

1. Behavioral regressions in the changed UI, store, controller, or gateway path
2. Cross-layer leakage between `src/app/` and `src/core/`
3. Broken workspace, auth, billing, or role-guard behavior
4. Missing validation, tests, or failure handling
5. i18n or route-registration drift

Focus questions:

- Does the change live in the right layer?
- Does it preserve route guards and navigation expectations?
- Does workspace switching still behave correctly?
- Are HTTP and WebSocket paths using the shared base classes properly?
- Are templates and translation files still aligned?
- Is the verification scope appropriate for the risk of the change?

Output format:

- findings first, ordered by severity
- open questions or assumptions
- short summary only after findings
