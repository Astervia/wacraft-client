# Skill: Fix i18n

Use this skill when Angular localized builds report missing translations or when
templates contain incorrect `i18n` annotations.

## Purpose

Resolve translation drift without turning dynamic values into translatable text
or breaking placeholder structure in XLF files.

## Inputs To Gather

Before editing, inspect:

- `src/locale/messages.xlf`
- `src/locale/messages.pt-BR.xlf`
- `src/locale/messages.es-CL.xlf`
- the affected templates under `src/app/`
- `angular.json` if extraction behavior looks unexpected

Optional commands:

- `npm run build`
- `ng extract-i18n --output-path src/locale`

## Workflow

1. Capture build warnings and locate the affected translation ids or templates.
2. Remove `i18n` from purely dynamic values.
3. Split translatable fallbacks into explicit branches where needed.
4. Re-extract translations.
5. Update `pt-BR` and `es-CL` targets while preserving placeholders.
6. Rebuild and confirm warnings are gone.

## Done Criteria

- templates use `i18n` only on human-readable static text
- translation files contain valid localized targets
- localized build output no longer reports the targeted missing translations
