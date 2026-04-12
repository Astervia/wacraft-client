## 2024-04-12 - Missing Focus Indicators on Icon Buttons

**Learning:** Found that inline icon-only buttons (like password visibility toggles) using `focus:outline-none` lack visual feedback for keyboard navigation, creating an accessibility barrier.
**Action:** Always provide a `focus-visible:ring-2` fallback when hiding default outlines on interactive elements to ensure keyboard users can track focus.
