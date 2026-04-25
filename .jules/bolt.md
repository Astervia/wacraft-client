## 2026-04-27 - O(N) Array Allocations on Map Iterator Lookups

**Learning:** Found a critical performance bottleneck where the codebase was using `[...map.values()].flat().find(...)` to search for items within a nested structure on every incoming websocket status update. This approach forces massive array allocations and iterates through the entire dataset multiple times, wasting memory and CPU cycles.
**Action:** Always replace `[...iterable].flat().find()` patterns with an early-exiting `for...of` loop over the iterable, which avoids intermediate array creations and reduces the time complexity overhead from O(N) allocations to O(1) space with an O(K) early exit.

## 2024-05-24 - Track by object reference in Angular @for loop

**Learning:** In Angular 17+ @for loops, tracking by object reference instead of a unique primitive identifier can cause unnecessary DOM updates and re-rendering if the object instance changes, even if the underlying data is identical.
**Action:** Always track list items by a unique primitive identifier (e.g., track item.id) rather than object reference to avoid re-evaluating the DOM on every Angular change detection cycle.
