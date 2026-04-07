# Fix i18n

Fix translation issues in templates and XLF resources for this repository.

Inputs:

- optional feature scope
- current build or extraction warnings

Workflow:

1. Identify missing translation warnings from `npm run build`.
2. Inspect templates for bad `i18n` usage, especially purely dynamic content.
3. Split dynamic fallbacks from static translatable text when necessary.
4. Re-run extraction with `ng extract-i18n --output-path src/locale`.
5. Update `messages.pt-BR.xlf` and `messages.es-CL.xlf`.
6. Preserve interpolation and tag placeholders exactly.
7. Rebuild and confirm warnings are gone.

Checks:

- templates only mark human-readable static text for translation
- XLF targets preserve placeholders and structural tags
- localized build warnings are resolved, not just suppressed
