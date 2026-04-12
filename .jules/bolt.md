## 2026-04-12 - Angular 17 @for Loop Tracking

**Learning:** In Angular 17+, the new control flow `@for` syntax requires tracking by a unique primitive identifier (e.g., `track item.id` instead of `track item`) for optimal DOM updates, otherwise it may fall back to tracking by object reference which causes unnecessary re-renders. A sweep across the entire project for all `@for` instances tracking object references was implemented to follow the performance guidelines.
**Action:** Always check the `track` expression of `@for` loops to ensure it points to a primitive value such as an ID, text, or a specific type property, avoiding tracking the whole object unless it is truly a primitive type.
