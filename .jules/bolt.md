## 2025-04-21 - Avoid Array Spread and Flattening on Large Maps

**Learning:** Using `.flat()` or array spread operators `[...iterable]` on large data structures like Maps to search for elements causes massive temporary memory allocation overhead and creates an O(N) operation just to structure the data for a search.
**Action:** Replace `[...map.values()].flat().find(...)` with `for...of` loops iterating through values and using early exits (`break` or `return`) once the element is found. This avoids intermediate object allocation and significantly boosts performance on large datasets.
