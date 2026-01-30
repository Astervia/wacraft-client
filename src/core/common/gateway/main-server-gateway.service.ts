/*  Centralised WebSocket gateway with:
 *    • Auto-reconnect using exponential back-off
 *    • Token hot-swap (subscribes to AuthService.token$)
 *    • Optional application-level ping/keep-alive
 *
 *  Make sure your backend recognises the ping payload:
 *      "ping"
 *  Otherwise tweak sendPingPayload().
 */

import { Injectable, inject } from "@angular/core";
import { AuthService } from "../../auth/service/auth.service";
import { WorkspaceContextService } from "../../workspace/store/workspace-context.service";
import { environment } from "../../../environments/environment";
import { ServerEndpoints } from "../constant/server-endpoints.enum";
import { firstValueFrom, Subject } from "rxjs";
import { WebsocketSentMessage } from "../model/websocket-sent-message.model";
import { NGXLogger } from "ngx-logger";

@Injectable({ providedIn: "root" })
export class MainServerGatewayService {
    private auth = inject(AuthService);
    private workspaceContext = inject(WorkspaceContextService);
    private logger = inject(NGXLogger);

    /* ───── Connection target ───── */
    private readonly prefix = `ws${environment.mainServerSecurity ? "s" : ""}://${environment.mainServerUrl}`;
    private path: string[] = [];

    /* ───── Socket instance ───── */
    private ws?: WebSocket;

    /* ───── Reactive once-only events ───── */
    openSubject = new Subject<Event>();
    errorSubject = new Subject<Event>();

    opened = firstValueFrom(this.openSubject);
    error = firstValueFrom(this.errorSubject);

    /* ───── Message subject ───── */
    /* The message event is used to avoid monitoring the WebSocket directly,
    as this may lead to unexpected behavior when the WebSocket reconnects. */
    messageSubject = new Subject<MessageEvent>();

    /* ───── Reconnection knobs ───── */
    autoReconnect = true;
    reconnectAttempts = 0;
    maxReconnectAttempts = 10;
    baseDelay = 2_000; // 2 s (doubles each retry)
    maxDelay = 60_000; // 1 min
    reconnectTimeout?: ReturnType<typeof setTimeout>;

    /* ───── Ping / keep-alive knobs ───── */
    sendPing = true; // disable if backend already handles ping/pong
    pingInterval = environment?.webSocketBasePingInterval ?? 30 * 1000; // use ping interval from environment variables
    private pingTimers = new WeakMap<WebSocket, ReturnType<typeof setInterval>>(); // One timer per socket

    /* ───── ctor ───── */
    constructor() {
        this.watchToken(); // auto-initialises socket and hot-swaps token
        this.watchWorkspace();
    }

    /* ───── Public path helpers ───── */
    setPath(...path: ServerEndpoints[]): void {
        this.path = path;
    }
    appendPath(...path: string[]): void {
        this.path = [...this.path, ...path];
    }

    /* ──────────────────────────────────────────────────────────────────────────
     *  (Re)-Establishes the WebSocket. Safe to call repeatedly (tears down old).
     *──────────────────────────────────────────────────────────────────────────*/
    setWs(token: string | null = localStorage.getItem("accessToken")): void {
        this.clearReconnectTimer();

        /* Build URL:  ws(s)://host/a/b?Authorization=Bearer xxxx */
        const base = `${this.prefix}/${this.path.map(p => encodeURIComponent(p)).join("/")}`;
        const u = new URL(base);
        const params: Record<string, string> = { Authorization: `Bearer ${token!}` };
        const workspaceId = this.workspaceContext.currentWorkspaceId;
        if (workspaceId) {
            params["workspace_id"] = workspaceId;
        }
        u.search = new URLSearchParams(params).toString();
        const url = u.toString();

        const ws = new WebSocket(url);

        /* ── Callbacks ── */
        ws.onopen = (ev: Event) => {
            this.logger.info("[WS] connected", { url });

            const previousWebsocket = this.ws;

            // Setup wegbsocket and watch for messages.
            this.ws = ws;
            this.bindSubjectToWebSocketNewMessage();

            /* Gracefully close previous socket (if any) */
            if (previousWebsocket && previousWebsocket !== ws) previousWebsocket.close();

            this.reconnectAttempts = 0;
            this.openSubject.next(ev);
            this.startPing(ws); // start keep-alive loop
        };

        ws.onclose = (ev: CloseEvent) => {
            this.logger.warn("[WS] closed", { ev });
            this.stopPing(ws);
        };

        ws.onerror = (ev: Event) => {
            this.logger.error("[WS] error", { ev });
            this.stopPing(ws);
            if (ws !== this.ws) return; // old socket: ignore errors and reconnect schedule
            this.errorSubject.next(ev);
            this.scheduleReconnect();
        };
    }

    /* ───── Token watcher ───── */
    private watchToken(): void {
        this.auth.token.subscribe(tok => this.setWs(tok));
    }

    /* ───── Workspace watcher ───── */
    private watchWorkspace(): void {
        this.workspaceContext.workspaceChanged.subscribe(() => this.setWs());
    }

    /* ───── Reconnection helpers ───── */
    private scheduleReconnect(): void {
        if (!this.autoReconnect) return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.error(`[WS] giving up after ${this.maxReconnectAttempts} tries`);
            return;
        }
        const delay = Math.min(this.baseDelay * 2 ** this.reconnectAttempts, this.maxDelay);
        this.reconnectAttempts += 1;
        this.logger.info(
            `[WS] retry ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay / 1000}s`,
        );
        this.reconnectTimeout = setTimeout(() => this.setWs(), delay);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }
    }

    /* ───── Ping helpers ───── */
    private startPing(ws: WebSocket): void {
        if (!this.sendPing) return;
        // clear any leftover timer for this ws (defensive)
        this.stopPing(ws);

        const t = setInterval(() => {
            if (this.isOpen(ws)) {
                ws.send(WebsocketSentMessage.ping);
            }
        }, this.pingInterval);

        this.pingTimers.set(ws, t);
    }
    private stopPing(ws?: WebSocket): void {
        const key = ws ?? this.ws;
        if (!key) return;
        const t = this.pingTimers.get(key);
        if (t) {
            clearInterval(t);
            this.pingTimers.delete(key);
        }
    }

    /* ───── Message helpers ──── */
    private bindSubjectToWebSocketNewMessage() {
        const ws = this.ws as WebSocket;
        ws.addEventListener("message", event => {
            if (ws !== this.ws) return; // Check if socket is the current socket to determine if the message will pass through (avoid message double forward).
            this.messageSubject.next(event);
        });
    }
    public async sendWebSocketMessage(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        await this.opened;
        if (!this.ws) throw Error("WebSocket isn't available");
        if (!this.isOpen) throw Error("WebSocket isn't open");
        this.ws.send(data);
    }

    /* ───── State helpers ───── */
    private isOpen(ws?: WebSocket): ws is WebSocket {
        return !!ws && ws.readyState === WebSocket.OPEN;
    }
    private isConnecting(ws?: WebSocket): ws is WebSocket {
        return !!ws && ws.readyState === WebSocket.CONNECTING;
    }
}
