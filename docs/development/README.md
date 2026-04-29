# Development

## Documents

- [`debugging.md`](./debugging.md) — timing logs, how to read them, and how to investigate message synchronization issues

## Quick start

```bash
npm install
npm start          # dev server at localhost:4200
npm test           # unit tests
npx tsc --noEmit   # type check without building
```

## Log levels

The application uses `ngx-logger`. Set the log level in `environment.ts`. At `DEBUG` level, `[msg-timing]` prefixed lines are emitted for message send/receive/status events. See [`debugging.md`](./debugging.md) for a full reference.
