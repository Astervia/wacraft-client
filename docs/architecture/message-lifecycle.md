# Message Lifecycle

Full journey of an outbound message from user action to confirmed delivery.

## Phases

```
1. EMIT       User submits → footer emits SentMessageEvent
2. OPTIMISTIC Store adds fake Conversation to unsentMessages
3. HTTP       Backend accepts message, returns real DB fields
4. WS-CONFIRM Backend pushes confirmed Conversation via WebSocket
5. STATUS     WhatsApp pushes sent/delivered/read via WebSocket
```

---

## 1. Emit — `ConversationFooterComponent`

`src/app/conversations/conversation-footer/conversation-footer.component.ts`

The footer starts the HTTP request **before** awaiting it, then emits both the sender data and the in-flight promise:

```typescript
const httpResponse = this.messageController.sendWhatsAppMessage(payload);
this.sent.emit({ senderData: payload.sender_data, httpResponse });
this.resetForm();
return httpResponse;
```

The same pattern applies to sub-builders (`InteractiveMessageBuilderComponent`, `LocationMessageBuilderComponent`, `ContactsMessageBuilderComponent`), all of which emit `SentMessageEvent` with the promise attached.

The parent template routes the event to the store:

```html
(sent)="userConversationStore.addUnsent($event.senderData, messagingProductContact.id,
$event.httpResponse)"
```

---

## 2. Optimistic display — `addUnsent`

`src/core/message/store/user-conversations-store.service.ts`

A fake `Conversation` is created immediately with a random UUID as `id` and the sender data attached:

```typescript
const fakeId = uuidv4();
const conversation: Conversation = {
    id: fakeId,
    sender_data: senderData,
    to_id: messagingProductContactId,
    from_id: NilUUID, // signals "outbound, not yet confirmed"
    messaging_product_id: "",
    created_at: new Date(),
    updated_at: new Date(),
};
```

It is unshifted to the front of `unsentMessages[mpcId]` and its `fakeId` is registered in `pendingIds`.

The conversation body renders two separate loops — `unsentMessages` first (with `[sent]="false"` which drives the pending spinner) then `messageHistory`.

---

## 3. HTTP response — in-place ID update

Still in `addUnsent`, the HTTP promise's `.then()` runs when the backend responds:

```
HTTP response contains: id (real DB UUID), product_data, sender_data, created_at, ...
```

Steps:

1. Acquire `messageMutex[fakeId]`
2. Check `stillPending` — is the fake entry still in `unsentMessages`?
3. If yes: `pendingIds.delete(fakeId)`, `Object.assign(conversation, fields)` — fake entry now has the real DB `id` in-place, Angular renders without a re-render cycle
4. Re-key `sentAt` from `fakeId` → `realId` for timing
5. Release mutex
6. Check `alreadyInHistory` — if the WebSocket confirmation for this message already arrived (WS beat HTTP), the entry is a stale duplicate; remove it from `unsentMessages` immediately

If `stillPending = false` the fake entry was already evicted by a WebSocket fallback match (see phase 4). Nothing to clean up.

---

## 4. WebSocket confirmation — `removeSent`

`MessageGatewayService` receives the confirmed `Conversation` from the backend WebSocket. The store's `init()` handler calls `removeSent` (fire-and-forget, concurrent with `appendConversationIfAtBottom`).

`removeSent` uses a **two-phase search**:

**Phase 1 — ID match (preferred)**
Scans the whole `unsentMessages` array for an entry whose `id` equals `incoming.id` AND is not in `pendingIds` (i.e. HTTP has already resolved and updated it).

**Phase 2 — Fallback content match**
Only reached if Phase 1 found nothing. Scans only entries still in `pendingIds` and deep-compares `sender_data[type]` (e.g. `text.body` for text messages).

The two-phase order is critical: a pending entry at the front of the queue (inserted most recently via `unshift`) must not shadow a real-id entry further back that should be the correct match.

After removal, `appendConversationIfAtBottom` adds the confirmed message to `messageHistory` (if the user is scrolled to the bottom).

---

## 5. Status updates

See [`../status/status-flow.md`](../status/status-flow.md).

---

## Key invariants

| Invariant                                                                       | Where enforced                                    |
| ------------------------------------------------------------------------------- | ------------------------------------------------- |
| Every outbound message appears instantly in the UI                              | `addUnsent` runs synchronously before HTTP awaits |
| A message is never in both `unsentMessages` and `messageHistory` with a real id | `alreadyInHistory` cleanup in HTTP `.then()`      |
| Status updates find messages regardless of which list they're in                | `watchNewStatus` searches both maps               |
| Rapid identical sends don't collide on removal                                  | Two-phase search: ID match beats fallback         |
