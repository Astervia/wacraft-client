# WaCraft Client — Documentation

## Contents

| Folder                             | What it covers                                                  |
| ---------------------------------- | --------------------------------------------------------------- |
| [`architecture/`](./architecture/) | End-to-end message lifecycle, concurrency model, WebSocket sync |
| [`status/`](./status/)             | Message status flow — the most operationally important section  |
| [`components/`](./components/)     | Deep-dives on individual services and components                |
| [`development/`](./development/)   | Local setup, debugging tools, timing logs                       |

## Where to start

- **Understanding how a sent message travels through the system** → [`architecture/message-lifecycle.md`](./architecture/message-lifecycle.md)
- **Understanding status updates (sent / delivered / read)** → [`status/status-flow.md`](./status/status-flow.md)
- **Understanding locking and race-condition handling** → [`architecture/concurrency-model.md`](./architecture/concurrency-model.md)
- **Understanding the central store** → [`components/conversation-store.md`](./components/conversation-store.md)
