# Architecture

## Documents

- [`message-lifecycle.md`](./message-lifecycle.md) — full journey of an outbound message, from user keystroke to delivered status
- [`concurrency-model.md`](./concurrency-model.md) — mutex strategy, `pendingIds`, and race-condition handling

## High-level overview

```
┌──────────────────────────────────────────────────────────────┐
│  Browser Tab                                                  │
│                                                               │
│  ConversationFooterComponent                                  │
│    │ (sent) → SentMessageEvent { senderData, httpResponse }  │
│    ▼                                                          │
│  UserConversationsStoreService                                │
│    ├─ unsentMessages   (optimistic, pending confirmation)     │
│    └─ messageHistory   (confirmed by WebSocket)               │
│                                                               │
│  MessageGatewayService  ◄──── WebSocket (new messages)       │
│  StatusGatewayService   ◄──── WebSocket (status updates)     │
└──────────────────────────────────────────────────────────────┘
         │ HTTP POST /message
         ▼
    Backend API  ──► WhatsApp Cloud API
                          │
                          ▼ webhook
                     Backend API  ──► WebSocket push to client
```

The client never waits for HTTP before showing a message. It displays an optimistic "pending" bubble immediately and reconciles when the WebSocket confirmation arrives.
