## 2026-04-22 - Avoid Array Spreading and Flattening on Large Map Data Structures

**Learning:** Using `[...map.values()].flat().find()` on a `Map` where values are large arrays causes massive temporary memory allocation overhead because it creates a new single giant array with every item, blocking the main thread during execution.
**Action:** When searching for an element within a `Map` of arrays, use `for...of` loops to iterate through values and `break` early. This maintains O(1) space complexity and minimizes search time by exiting as soon as the element is found.
