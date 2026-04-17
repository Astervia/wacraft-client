## 2026-04-17 - Fix Focus Accessibility and Associated Target Labels

**Learning:** When using utility classes like `focus:outline-none` on interactive elements, it's critical to ensure that keyboard focus is still accessible by adding a fallback indicator like `focus-visible:ring-2`. Additionally, form inputs must provide a matching `id` corresponding to the `for` attribute in the associated label to ensure compatibility with screen readers and focus functionalities.
**Action:** Always provide an accessible fallback for keyboard navigation, such as `focus-visible:ring-2` (often paired with a color like `focus-visible:ring-blue-500/50`) when removing standard focus outlines. Additionally, always explicitly include an `id` on inputs referenced by a `for` attribute from a `<label>`.
