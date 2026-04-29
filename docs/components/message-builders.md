# Message Builders

Components responsible for composing and sending messages.

---

## ConversationFooterComponent

`src/app/conversations/conversation-footer/conversation-footer.component.ts`

The main message input bar. Handles text, media, raw JSON, and delegates to sub-builders for interactive, location, and contacts message types.

**Output:** `@Output() sent = new EventEmitter<SentMessageEvent>()`

For text, media, and raw messages, the footer directly owns the HTTP call:

```typescript
const httpResponse = this.messageController.sendWhatsAppMessage(payload);
this.sent.emit({ senderData: payload.sender_data, httpResponse });
this.resetForm();
return httpResponse;
```

For interactive / location / contacts, the footer delegates to the sub-builder's send method and the sub-builder emits its own `sent` event, which the footer re-emits via the template binding `(sent)="sent.emit($event)"`.

---

## Sub-builders

All sub-builders share the same `SentMessageEvent` output contract: start the HTTP request, emit with the promise, then await.

| Component                            | Type                         | File                           |
| ------------------------------------ | ---------------------------- | ------------------------------ |
| `InteractiveMessageBuilderComponent` | Interactive (buttons, lists) | `interactive-message-builder/` |
| `LocationMessageBuilderComponent`    | Location pin                 | `location-message-builder/`    |
| `ContactsMessageBuilderComponent`    | vCard contacts               | `contacts-message-builder/`    |

### Common send pattern

```typescript
const httpResponse = this.messageController.sendWhatsAppMessage(payload);
this.sent.emit({ senderData: payload.sender_data, httpResponse });
this.resetForm();
return httpResponse; // or await httpResponse for error handling
```

---

## MessageActionsFooterComponent

`src/app/conversations/message-actions-footer/message-actions-footer.component.ts`

Shown when messages are selected (multi-select mode). Allows forwarding selected messages to other contacts.

**Output:** `@Output() sent = new EventEmitter<[SentMessageEvent, string]>()`

The second element of the tuple is the target `messagingProductContactId`. The parent template maps this to:

```html
(sent)="userConversationStore.addUnsent($event[0].senderData, $event[1], $event[0].httpResponse)"
```

---

## TemplateMessageBuilderComponent

`src/app/templates/template-message-builder/template-message-builder.component.ts`

Sends template messages to multiple contacts. Calls `addUnsent` directly (not via an event):

```typescript
const promise = this.messageController.sendWhatsAppMessage({ to_id, sender_data });
promise.catch(err => this.handleErr(...));
this.userConversationStore.addUnsent(sender_data, to_id, promise);
```
