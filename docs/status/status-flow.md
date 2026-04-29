# Message Status Flow

## Overview

Status updates travel from WhatsApp → backend webhook → WebSocket push → client store → UI. The client never polls for statuses; it receives them as real-time events.

```
WhatsApp Cloud API
  │  webhook POST (status event)
  ▼
Backend API
  │  WebSocket push  →  StatusGatewayService
  ▼
UserConversationsStoreService.watchNewStatus()
  │  find message in messageHistory or unsentMessages
  │  insert into message.statuses[] respecting order
  ▼
ConversationMessageComponent  (Angular change detection)
```

---

## Data model

### `StatusFields`

```typescript
interface StatusFields extends Audit {
    message_id: string; // FK → messages.id (internal DB UUID)
    product_data: ProductData; // contains: { status: SendingStatus, ... }
}
```

### `SendingStatus` ordering

```
failed    (0) — highest priority, always shown first
read      (1)
delivered (2)
sent      (3) — lowest priority
```

A message accumulates multiple status entries. The one at `statuses[0]` is always the highest-priority status received so far and is what the UI displays.

---

## Status insertion logic

`watchNewStatus` in `UserConversationsStoreService`:

```typescript
const currentStatus = message.statuses[0]?.product_data?.status;

// First status ever, or incoming has no status field
if (message.statuses.length === 0 || !data.product_data.status || !currentStatus)
    return message.statuses.unshift(data); // prepend

const currentOrder = statusOrder.get(currentStatus) || 0;
const incomingOrder = statusOrder.get(data.product_data.status) || 0;

if (incomingOrder < currentOrder) return message.statuses.unshift(data); // higher priority → prepend
return message.statuses.push(data); // lower/equal priority → append
```

This means `statuses[0]` always holds the most actionable status. A `failed` status will surface immediately even if `delivered` was already received.

---

## Message lookup

Statuses are matched to messages by `message_id` (the internal DB UUID). The store searches both lists:

```typescript
for (const conversations of [
    ...this.messageHistory.values(),
    ...this.unsentMessages.values(), // ← covers pending messages
]) {
    message = conversations.find(item => item.id === messageId);
    if (message) break;
}
```

`unsentMessages` is searched because a status update for a just-sent message can arrive while the message is still optimistic (i.e. before the WebSocket new-message confirmation). This is possible because:

1. Client sends HTTP request
2. Backend responds (HTTP): message gets `id = realDbId` via `Object.assign` in the store
3. Backend pushes status via WebSocket (can arrive before the new-message WebSocket push)
4. Client receives status → searches `unsentMessages` → finds message by `realDbId` ✓

If the lookup fails (message not found in either list), the status is silently dropped. This can happen when a status arrives for a message that was sent in a previous session and is not loaded in the current history window.

---

## Timing relative to the message lifecycle

```
t=0ms    addUnsent()          → fake entry in unsentMessages (no id yet)
t=~300ms HTTP response        → fake entry gets realDbId via Object.assign
t=~400ms WS new-message       → entry moved from unsentMessages → messageHistory
t=~500ms status: sent         → found in messageHistory, statuses[0] = sent
t=~3000ms status: delivered   → found in messageHistory, statuses[0] = delivered
t=varies  status: read        → found in messageHistory, statuses[0] = read
```

Under load (rapid sends), HTTP may arrive after the WS new-message push. In that case the status can arrive while the entry is still in `unsentMessages` under its real id — the dual-list search handles this correctly.

---

## Why statuses can arrive out of order

WhatsApp's webhook delivers events independently. Network conditions, server processing queues, and webhook retries mean a `delivered` event can arrive before `sent`, or `read` before `delivered`. The priority ordering in the insertion logic ensures the UI always shows the highest-priority status regardless of arrival order.

---

## UI rendering

`ConversationMessageComponent` reads `message.statuses[0]?.product_data?.status` to determine which icon to show. Because Angular uses the object reference for change detection on arrays, and the store mutates `statuses` in-place (`unshift`/`push`), the component re-renders automatically when the array contents change.

---

## Edge cases

| Scenario                                               | Behaviour                                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Status arrives before HTTP resolves                    | `message_id` not yet in any list → status dropped                                         |
| Status arrives while entry is in `unsentMessages`      | Found and updated correctly (dual-list search)                                            |
| Duplicate status delivery (webhook retry)              | Appended to `statuses[]` at the appropriate position; UI shows the highest-priority entry |
| Status for a message not in the current history window | Silently dropped (message not found)                                                      |
