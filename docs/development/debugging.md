# Debugging

## Timing logs

`UserConversationsStoreService` emits `[msg-timing]` prefixed debug logs at key points in the message lifecycle. Enable `DEBUG` log level to see them.

### Log reference

| Log line                                                                    | When                            | What it tells you                                        |
| --------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------- |
| `addUnsent fakeId=X type=text to=Y`                                         | `addUnsent` entry               | A new optimistic entry was created                       |
| `fakeId=X list-lock-wait=Nms`                                               | After `unsentMutex` released    | How long the list lock was contended                     |
| `HTTP resolved: fakeId=X → realId=Y elapsed=Nms`                            | HTTP response processed         | Round-trip time; entry now matchable by ID               |
| `HTTP resolved: ... — cleaned up stale unsent entry`                        | HTTP, WS already in history     | A WS-before-HTTP race was cleaned up; no duplicate       |
| `HTTP resolved: fakeId=X elapsed=Nms — WS already removed it via fallback`  | HTTP, entry already gone        | WS correctly removed entry before HTTP; normal fast path |
| `WS confirmed: strategy=id total=Nms lock-wait=Nms`                         | `removeSent` matched by ID      | Clean match; HTTP arrived before WS                      |
| `WS confirmed: strategy=fallback total=Nms lock-wait=Nms`                   | `removeSent` matched by content | WS arrived before HTTP; fallback used                    |
| `status arrived: msgId=X status=sent foundIn=history`                       | Status received                 | Normal path; message already confirmed                   |
| `status arrived: msgId=X status=sent foundIn=unsent elapsed-since-send=Nms` | Status received                 | Status arrived while message still pending               |
| `status arrived: msgId=X status=sent — not found in history or unsent`      | Status received                 | Status dropped; message not in current window            |

### Healthy send sequence (HTTP before WS)

```
addUnsent fakeId=abc type=text to=mpc-id
fakeId=abc list-lock-wait=0.3ms
HTTP resolved: fakeId=abc → realId=db-uuid elapsed=280ms
WS confirmed: strategy=id total=400ms lock-wait=0.1ms
status arrived: msgId=db-uuid status=sent foundIn=history elapsed-since-send=450ms
status arrived: msgId=db-uuid status=delivered foundIn=history elapsed-since-send=3200ms
```

### WS-before-HTTP sequence (common under load)

```
addUnsent fakeId=abc type=text to=mpc-id
fakeId=abc list-lock-wait=0.5ms
WS confirmed: strategy=fallback total=350ms lock-wait=2ms
HTTP resolved: fakeId=abc elapsed=380ms — WS already removed it via fallback
status arrived: msgId=db-uuid status=sent foundIn=history elapsed-since-send=400ms
```

### WS-before-HTTP with cleanup (rapid sends, was the bug)

```
addUnsent fakeId=abc type=text to=mpc-id
WS confirmed: strategy=fallback total=350ms ...   ← removed a *different* fake entry
HTTP resolved: fakeId=abc → realId=db-uuid elapsed=400ms — cleaned up stale unsent entry (WS already in history)
```

The `cleaned up stale unsent entry` line means a duplicate was detected and removed. If this appears frequently, it indicates the WS-before-HTTP race is active (expected under load) and the cleanup mechanism is working.

## Investigating duplicate unsent messages

If messages appear both as "unsent" and "delivered":

1. Enable DEBUG logs
2. Send several messages rapidly
3. Look for `WS confirmed: strategy=fallback` lines — each one means WS arrived before HTTP for that message
4. Check if `HTTP resolved: ... cleaned up stale unsent entry` appears for each — if yes, cleanup fired correctly
5. If messages are still duplicated, check if any `status arrived: ... — not found` lines correspond to the stuck IDs — this would indicate the real id is not reachable in the current history window

## Common performance numbers

| Metric                                 | Expected   | Investigate if                     |
| -------------------------------------- | ---------- | ---------------------------------- |
| `list-lock-wait`                       | < 5ms      | > 50ms — contention on rapid sends |
| HTTP `elapsed`                         | 200–800ms  | > 3000ms — backend latency         |
| `WS confirmed total`                   | 300–2000ms | > 10000ms — WS delivery issue      |
| `elapsed-since-send` for `sent` status | 400–1500ms | > 5000ms — WhatsApp API delay      |
