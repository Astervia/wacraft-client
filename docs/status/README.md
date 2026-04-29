# Message Status

## Documents

- [`status-flow.md`](./status-flow.md) — lifecycle of a status update from WhatsApp webhook to UI render, including matching logic and ordering

## Quick reference

| Status      | Meaning                           | Typical delay after send |
| ----------- | --------------------------------- | ------------------------ |
| `sent`      | WhatsApp API accepted the message | < 1s                     |
| `delivered` | Recipient device received it      | seconds to minutes       |
| `read`      | Recipient opened the conversation | minutes to hours         |
| `failed`    | Delivery failed permanently       | varies                   |

Status ordering is defined in `src/core/status/constant/status-order.constant.ts`. Lower order values represent higher priority (e.g. `failed=0` always surfaces first).
