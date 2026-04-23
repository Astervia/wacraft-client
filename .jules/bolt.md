## 2026-04-23 - Memory Allocation Overhead in Map Iteration

**Learning:** Using `[...map.values()].flat().find(...)` to search for an element across a Map containing arrays causes massive temporary memory allocation overhead because the entire iterator is consumed and copied into multiple new arrays (one from spread, one from flat) before iteration begins, turning an O(1) space search into an O(N) space and O(N) time operation prior to the actual lookup.
**Action:** When searching for elements within complex data structures like Maps of arrays, always use `for...of` loops with early returns or breaks. This avoids creating intermediate arrays and ensures the minimum necessary work is performed for each search operation.
