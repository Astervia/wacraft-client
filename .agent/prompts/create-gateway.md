# Create Gateway Service

Scaffold a WebSocket gateway that extends `MainServerGatewayService`.

Inputs:

- domain name
- websocket endpoint path
- expected incoming message types

Workflow:

1. Add the endpoint to `ServerEndpoints`.
2. Create the gateway under `src/core/<domain>/gateway/`.
3. Extend `MainServerGatewayService`, call `setPath(...)`, then `setWs()`.
4. Parse raw messages from `messageSubject` and fan them out through typed
   subjects only when needed.
5. Keep store updates out of the gateway itself unless the repo already uses
   that pattern in the same domain.
6. Let token and workspace changes reconnect through the shared base class.

Checks:

- reconnect, ping, and auth behavior stay centralized
- message parsing is explicit and failure-tolerant
- the gateway surface is narrow and domain-specific
