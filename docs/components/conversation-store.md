# UserConversationsStoreService

`src/core/message/store/user-conversations-store.service.ts`

Singleton Angular service (root-provided). Owns all client-side message state and coordinates between HTTP, WebSocket, and the UI.

---

## Public state

| Property                            | Type                                | Description                                                                                         |
| ----------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `messageHistory`                    | `Map<mpcId, Conversation[]>`        | Confirmed messages, newest first (index 0 = newest)                                                 |
| `unsentMessages`                    | `Map<mpcId, Conversation[]>`        | Optimistic pending messages, newest first                                                           |
| `newBottomMessageFromConversations` | `Map<mpcId, Subject<Conversation>>` | Emits when a new message is added at the bottom; used by `ConversationBodyComponent` to auto-scroll |
| `paginationLimit`                   | `number`                            | Page size for history fetches (default 50)                                                          |

---

## Public methods

### `initConditionally(route, mpcId)`

Idempotent initializer. Safe to call from multiple `ConversationBodyComponent` instances. On first call, opens the WebSocket gateways and starts listening for new messages and statuses.

### `addUnsent(senderData, mpcId, httpResponse?)`

Creates an optimistic message entry and registers it in `unsentMessages`. Accepts an optional HTTP promise; when it resolves, updates the fake entry in-place with real DB fields and handles the `alreadyInHistory` duplicate cleanup. See [`../architecture/message-lifecycle.md`](../architecture/message-lifecycle.md).

### `getTop(mpcId)` / `getBottom(mpcId)`

Paginated history fetch. `getTop` appends older messages; `getBottom` prepends newer ones. Both are mutex-guarded.

### `markAsRead(mpcId)`

Fires an API call to mark the most recent inbound message as read by the agent.

### `sendTyping(mpcId)`

Sends a typing indicator to the contact.

### `getOffset(mpcId)` / `setOffset(mpcId, offset)` / `resetHistory(mpcId)`

Scroll-position bookkeeping. Offset tracks how far from the newest message the current history window starts; used to avoid appending WS messages to a scrolled-up view.

---

## Internal state

| Field             | Purpose                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `pendingIds`      | Set of fake UUIDs for messages whose HTTP response has not yet resolved |
| `messageMutex`    | Per-message mutex for the `Object.assign` update in HTTP `.then()`      |
| `unsentMutex`     | Per-contact mutex for all `unsentMessages` array operations             |
| `sentAt`          | Timing map: message id → `performance.now()` at `addUnsent`             |
| `offsets`         | Per-contact scroll offset                                               |
| `reachedMaxLimit` | Per-contact flag indicating no more history to load                     |

---

## Message matching in `removeSent`

Two-phase search, in priority order:

1. **Phase 1 (ID match):** scan entire `unsentMessages[mpcId]` for `msg.id === incoming.id` where `msg.id` is not in `pendingIds`. This is only possible after the HTTP response has updated the fake entry.

2. **Phase 2 (fallback):** scan only entries still in `pendingIds` and deep-compare `sender_data[type]` (e.g. `sender_data.text` for text messages). Used when HTTP has not yet resolved for any matching entry.

Phase 1 must always run first. Under rapid sends, Phase 2 can pick the wrong pending entry if a real-id entry exists further back in the queue — Phase 1 prevents this by exhausting all ID-match candidates before falling back.
