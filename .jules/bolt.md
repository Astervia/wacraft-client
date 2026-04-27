## 2026-04-27 - O(N) Array Allocations on Map Iterator Lookups

**Learning:** Found a critical performance bottleneck where the codebase was using `[...map.values()].flat().find(...)` to search for items within a nested structure on every incoming websocket status update. This approach forces massive array allocations and iterates through the entire dataset multiple times, wasting memory and CPU cycles.
**Action:** Always replace `[...iterable].flat().find()` patterns with an early-exiting `for...of` loop over the iterable, which avoids intermediate array creations and reduces the time complexity overhead from O(N) allocations to O(1) space with an O(K) early exit.
