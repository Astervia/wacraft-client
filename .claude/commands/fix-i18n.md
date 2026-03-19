# Fix i18n Translations

You are a translation workflow assistant for this Angular project. Your job is to fix i18n annotation issues in HTML templates and ensure all translations are present in the XLF files.

## Context

- Source locale: `en`
- Target locales: `pt-BR` (Portuguese Brazil), `es-CL` (Spanish Chile)
- Translation files: `src/locale/messages.xlf`, `src/locale/messages.pt-BR.xlf`, `src/locale/messages.es-CL.xlf`
- Format: XLIFF 1.2
- Extract tool: `ng-extract-i18n-merge` (configured in angular.json)

## Workflow

Execute these steps in order. After each major step, verify before moving on.

### Step 1: Identify problems

Run `npm run build 2>&1 | grep "No translation found"` to get all missing translation warnings. Parse out the translation IDs and source texts.

Also scan HTML templates for bad i18n annotation patterns:
- `i18n` on elements where the **only** content is a dynamic interpolation with a fallback (e.g., `<span i18n>{{ value || "Fallback" }}</span>`) — the dynamic value is NOT translatable, only the fallback is
- `i18n` on elements with ternary expressions as the sole content
- `i18n` on elements mixing static text with complex expressions that should be split

Use `grep -rn` patterns across `src/app/**/*.html` to find these.

### Step 2: Fix bad i18n HTML annotations

For each problematic annotation, restructure the HTML. The goal is to separate dynamic (non-translatable) content from static (translatable) content.

**Pattern: Dynamic value with fallback**
```html
<!-- BAD -->
<span i18n>{{ name || "Unknown" }}</span>

<!-- GOOD: Split into dynamic vs translatable fallback -->
@if (name) {
    <span>{{ name }}</span>
} @else {
    <span i18n>Unknown</span>
}
```

**Pattern: Count with text (simple interpolation is OK)**
```html
<!-- OK as-is — Angular handles interpolations as {$INTERPOLATION} placeholders -->
<span i18n>{{ count }} contacts</span>

<!-- BETTER for pluralization -->
<span i18n>{count, plural, =1 {1 contact} other {{{count}} contacts}}</span>
```

**Pattern: Indexed labels like "Contact {{ i + 1 }}"**
```html
<!-- OK — interpolation works, but add description for translators -->
<h3 i18n="@@contactIndex">Contact {{ i + 1 }}</h3>
```

**Pattern: Static text mixed with dynamic pipe output**
```html
<!-- OK if the structure is clear — Angular extracts interpolations as placeholders -->
<!-- Just ensure the translatable static parts are clear -->
<span i18n>Rate limit reached. Try again in <strong>{{ seconds | countdown }}</strong></span>
```

**General rules:**
- Use `@if`/`@else` to separate dynamic values from translatable fallbacks
- Keep `i18n` on elements with static text content (interpolations as placeholders are fine)
- Remove `i18n` from elements whose entire content is a dynamic variable (not translatable)
- Use `ng-container` or `span` wrappers when needed to isolate translatable text
- Preserve existing CSS classes and structural layout

### Step 3: Lint and format changed files

After modifying HTML/TS files, run lint and format **only on the changed files**:

```bash
# Get list of changed HTML and TS files
CHANGED_FILES=$(git diff --name-only --diff-filter=ACMR | grep -E '\.(html|ts)$')

# Lint only changed files (if any)
if [ -n "$CHANGED_FILES" ]; then
    npx ng lint --lint-file-patterns $CHANGED_FILES
fi

# Format only changed files
CHANGED_ALL=$(git diff --name-only --diff-filter=ACMR)
if [ -n "$CHANGED_ALL" ]; then
    npx prettier --write $CHANGED_ALL
fi
```

Fix any lint errors before proceeding. Re-run until clean.

### Step 4: Extract and merge translations

Run the extraction to regenerate the source XLF and merge into target files:

```bash
ng extract-i18n --output-path src/locale
```

This uses `ng-extract-i18n-merge` which automatically merges new entries into `messages.pt-BR.xlf` and `messages.es-CL.xlf` with `state="new"` markers.

### Step 5: Add translations

Open `src/locale/messages.pt-BR.xlf` and `src/locale/messages.es-CL.xlf`. Find all `<trans-unit>` entries that either:
- Have `state="new"` on the `<target>` element
- Are missing a `<target>` element entirely
- Have a `<target>` that just copies the English `<source>`

For each one, provide an accurate translation:
- **pt-BR**: Brazilian Portuguese
- **es-CL**: Chilean Spanish

Translation format in the XLF file:
```xml
<trans-unit id="1234567890" datatype="html">
    <source>Original English text</source>
    <target state="translated">Translated text here</target>
</trans-unit>
```

**Important:**
- Preserve `{$INTERPOLATION}`, `{$START_TAG_*}`, `{$CLOSE_TAG_*}` placeholders exactly as they appear in `<source>`
- Translate only the human-readable text around the placeholders
- Remove `state="new"` and replace with `state="translated"` (or remove the state attribute)
- Do NOT translate technical terms that are commonly kept in English (e.g., "webhook", "API", "PIN")

### Step 6: Lint and format translation files

```bash
CHANGED_XLF=$(git diff --name-only --diff-filter=ACMR | grep -E '\.xlf$')
if [ -n "$CHANGED_XLF" ]; then
    npx prettier --write $CHANGED_XLF
fi
```

### Step 7: Build and verify

Run the full build to check for zero translation warnings:

```bash
npm run build 2>&1 | grep -E "warning|error|No translation found"
```

If there are still missing translations, go back to Step 5 and fix them. Repeat until the build is clean (no "No translation found" warnings).

## Argument

If an argument is provided (e.g., `/fix-i18n contact-info`), scope the work to only files matching that pattern. Otherwise, fix all issues project-wide.

$ARGUMENTS
