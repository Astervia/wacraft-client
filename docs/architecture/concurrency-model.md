# Concurrency Model

The store uses multiple `MutexSwapper` instances to coordinate concurrent async operations. JavaScript is single-threaded, but `await` creates yield points where interleaving can occur.

## Mutexes

All mutexes are instances of `MutexSwapper<string>`, which maintains one `async-mutex` Mutex per key and cleans up when the usage count drops to zero.

| Mutex                  | Key                         | Protects                                                  |
| ---------------------- | --------------------------- | --------------------------------------------------------- |
| `unsentMutex`          | `messagingProductContactId` | Read/write of the `unsentMessages[mpcId]` array           |
| `messageMutex`         | `fakeId`                    | `Object.assign` update of a single pending message object |
| `getMutex`             | `messagingProductContactId` | History fetch pagination                                  |
| `offsetMu`             | `messagingProductContactId` | The scroll offset value                                   |
| `createBottomMsgSubMu` | `messagingProductContactId` | Creation of per-contact RxJS Subject                      |
| `reachedMaxLimitMu`    | `messagingProductContactId` | Max-limit flag                                            |

Lock acquisition order within a single async chain is always: `messageMutex[fakeId]` → `unsentMutex[mpcId]`. No path holds `unsentMutex` while acquiring `messageMutex`, so there is no deadlock risk.

---

## `pendingIds` Set

```typescript
private pendingIds = new Set<string>();
```

Tracks which message IDs are still fake (HTTP response not yet resolved). An id is in `pendingIds` from the moment `addUnsent` runs until either:

- the HTTP `.then()` resolves and calls `pendingIds.delete(fakeId)`, or
- `removeSent` removes the entry and calls `pendingIds.delete(removed.id)`.

This set is the switch that controls which matching strategy `removeSent` uses per entry:

- `pendingIds.has(msg.id)` → true → entry is still fake → only eligible for fallback content match
- `pendingIds.has(msg.id)` → false → entry has a real DB id → eligible for Phase 1 ID match

---

## `sentAt` Map

```typescript
private sentAt = new Map<string, number>(); // id → performance.now()
```

Stores the `performance.now()` timestamp at the moment `addUnsent` was called, keyed by message id. Used exclusively for timing logs.

The key transitions from `fakeId` → `realId` when HTTP resolves (so `removeSent` can compute total elapsed time even when it matches by real id).

Entries are deleted by whichever code path finalizes the message (`removeSent` on WS match, or the `alreadyInHistory` cleanup path in HTTP `.then()`).

---

## Race conditions handled

### WS arrives before HTTP resolves

The most common case under load. WS confirmation arrives while the entry is still in `pendingIds`. `removeSent` Phase 2 (fallback content match) removes the correct pending entry. Later, when HTTP resolves, `stillPending = false` → nothing to do.

### HTTP resolves before WS

`Object.assign` updates the fake entry with real DB fields. `pendingIds.delete(fakeId)` moves it out of the pending set. When WS arrives later, Phase 1 (ID match) finds it immediately, regardless of array position.

### WS beats HTTP AND removes the wrong pending entry (rapid sends with identical content)

Under rapid sends, fallback matching (Phase 2) can remove a different pending entry that happens to share the same message content. The correct fake entry remains in `unsentMessages` and later gets its id updated by HTTP.

Resolved by the `alreadyInHistory` check in the HTTP `.then()`: after `Object.assign`, the code checks if the real id is already in `messageHistory`. If yes (WS added it there while the entry was misrouted), the now-real-id entry is removed from `unsentMessages` and the duplicate is eliminated.

### Ordering collision (Phase 2 picks front entry over a real-id entry further back)

Before the two-phase fix, a single `findIndex` would return a pending entry at the front of the `unshift`-ordered queue before ever reaching a real-id entry. Phase 1 now always scans the entire array for an ID match first, preventing this.
