## 2024-04-09 - Focus State Accessibility

**Learning:** There is a common pattern in the application's common components where buttons (especially icon-only buttons) apply `focus:outline-none` or `outline-none` to remove the default browser focus ring, but fail to provide a fallback focus indicator. This makes keyboard navigation very difficult as users lose track of their active element.

**Action:** Whenever applying `focus:outline-none` or `outline-none` to remove native outlines, ensure an accessible replacement like `focus-visible:ring-2` (often paired with a ring color like `focus-visible:ring-gray-400`) is added so keyboard users still get visual feedback while mouse users don't see distracting rings.
