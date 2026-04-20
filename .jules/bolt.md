## 2024-04-20 - Expensive Array Flattening on Large Maps

**Learning:** Found a performance bottleneck where `[...map.values()].flat().find(...)` was used to search for a specific item across all arrays stored in a Map. This creates a full copy of the arrays, flattens them, and then searches, resulting in massive temporary memory allocation and O(N) performance hit on every status update event, which blocks the main thread in a busy chat app.
**Action:** Replace `[...map.values()].flat().find(...)` with a `for...of` loop over `map.values()` and use `.find()` on each sub-array, breaking early once found. This avoids large temporary memory allocations and makes the search much faster.
