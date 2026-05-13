import { Injectable, OnDestroy, inject } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { distinctUntilChanged, map } from "rxjs/operators";
import { v4 as uuidv4 } from "uuid";
import { NGXLogger } from "ngx-logger";
import { UserConversationsStoreService } from "../store/user-conversations-store.service";
import { LocalSettingsService } from "../../../app/local-settings.service";
import { MutexSwapper } from "../../synch/mutex-swapper/mutex-swapper";

type SessionPhase = "idle-extendable" | "response-awaiting";
type SessionEndReason = "idle-timeout" | "response-received" | "explicit-stop";

interface TypingSession {
    id: string;
    mpcId: string;
    phase: SessionPhase;
    startedAt: number;
    endedAt?: number;
    endReason?: SessionEndReason;
    idleTimer?: ReturnType<typeof setTimeout>;
}

interface ConversationTypingState {
    sessions: Map<string, TypingSession>;
    count$: BehaviorSubject<number>;
    refreshTimer?: ReturnType<typeof setTimeout>;
}

/**
 * Tracks typing sessions per conversation.
 *
 * Per WhatsApp/Meta, a typing indicator dismisses after 25s of silence or when
 * a message is sent. A conversation can hold multiple overlapping sessions:
 * the user can start a new keystroke session while a previous one is still
 * awaiting the server's response to a sent message.
 *
 * The active session count drives the UI; mutations serialize per mpcId via
 * MutexSwapper so concurrent keystrokes, idle-timer fires, and response
 * settlements cannot race.
 */
@Injectable({ providedIn: "root" })
export class TypingIndicatorService implements OnDestroy {
    private userConversationsStore = inject(UserConversationsStoreService);
    private localSettings = inject(LocalSettingsService);
    private logger = inject(NGXLogger);

    static readonly IDLE_TIMEOUT_MS = 25000;
    static readonly REFRESH_INTERVAL_MS = 20000;

    private state = new Map<string, ConversationTypingState>();
    private mutex = new MutexSwapper<string>();

    typingCount$(mpcId: string): Observable<number> {
        return this.getOrCreateState(mpcId).count$.asObservable();
    }

    isTyping$(mpcId: string): Observable<boolean> {
        return this.typingCount$(mpcId).pipe(
            map(n => n > 0),
            distinctUntilChanged(),
        );
    }

    /**
     * Note a keystroke. Extends the current idle-extendable session if one
     * exists; otherwise opens a fresh session. No-op when sending typing is
     * disabled in local settings — including the local balloon.
     */
    async noteUserInput(mpcId: string): Promise<void> {
        if (!this.localSettings.sendTyping) return;

        let shouldPingNow = false;
        await this.mutex.acquire(mpcId);
        try {
            const state = this.getOrCreateState(mpcId);
            const existing = this.findIdleExtendableSession(state);
            if (existing) {
                this.resetIdleTimer(mpcId, existing);
                return;
            }
            const session: TypingSession = {
                id: uuidv4(),
                mpcId,
                phase: "idle-extendable",
                startedAt: Date.now(),
            };
            this.resetIdleTimer(mpcId, session);
            state.sessions.set(session.id, session);
            state.count$.next(state.sessions.size);

            if (!state.refreshTimer) {
                shouldPingNow = true;
                state.refreshTimer = setTimeout(
                    () => this.refreshTick(mpcId),
                    TypingIndicatorService.REFRESH_INTERVAL_MS,
                );
            }
        } finally {
            await this.mutex.release(mpcId);
        }
        if (shouldPingNow) this.postTypingPing(mpcId);
    }

    /**
     * Transition the current idle-extendable session into response-awaiting.
     * The session closes when `response` settles (resolved or rejected).
     * No-op if no idle-extendable session exists.
     */
    async awaitResponse(mpcId: string, response: Promise<unknown>): Promise<void> {
        let sessionId: string | undefined;
        await this.mutex.acquire(mpcId);
        try {
            const state = this.state.get(mpcId);
            if (!state) return;
            const idle = this.findIdleExtendableSession(state);
            if (!idle) return;
            if (idle.idleTimer) {
                clearTimeout(idle.idleTimer);
                idle.idleTimer = undefined;
            }
            idle.phase = "response-awaiting";
            sessionId = idle.id;
        } finally {
            await this.mutex.release(mpcId);
        }
        if (!sessionId) return;
        try {
            await response;
        } catch {
            // Drop the balloon regardless of response outcome.
        }
        await this.closeSession(mpcId, sessionId, "response-received");
    }

    /** Close every active session for a conversation. */
    async stopAll(mpcId: string): Promise<void> {
        await this.mutex.acquire(mpcId);
        try {
            const state = this.state.get(mpcId);
            if (!state) return;
            for (const session of state.sessions.values()) {
                if (session.idleTimer) {
                    clearTimeout(session.idleTimer);
                    session.idleTimer = undefined;
                }
                session.endedAt = Date.now();
                session.endReason = "explicit-stop";
            }
            state.sessions.clear();
            this.stopRefreshLoopLocked(state);
            state.count$.next(0);
        } finally {
            await this.mutex.release(mpcId);
        }
    }

    ngOnDestroy(): void {
        for (const state of this.state.values()) {
            for (const session of state.sessions.values()) {
                if (session.idleTimer) clearTimeout(session.idleTimer);
            }
            if (state.refreshTimer) clearTimeout(state.refreshTimer);
            state.count$.complete();
        }
        this.state.clear();
    }

    private getOrCreateState(mpcId: string): ConversationTypingState {
        let state = this.state.get(mpcId);
        if (!state) {
            state = {
                sessions: new Map(),
                count$: new BehaviorSubject<number>(0),
            };
            this.state.set(mpcId, state);
        }
        return state;
    }

    private findIdleExtendableSession(state: ConversationTypingState): TypingSession | undefined {
        for (const session of state.sessions.values()) {
            if (session.phase === "idle-extendable") return session;
        }
        return undefined;
    }

    private resetIdleTimer(mpcId: string, session: TypingSession): void {
        if (session.idleTimer) clearTimeout(session.idleTimer);
        const timer: ReturnType<typeof setTimeout> = setTimeout(
            () => void this.onIdleTimerFire(mpcId, session.id, timer),
            TypingIndicatorService.IDLE_TIMEOUT_MS,
        );
        session.idleTimer = timer;
    }

    private async onIdleTimerFire(
        mpcId: string,
        sessionId: string,
        firingTimer: ReturnType<typeof setTimeout>,
    ): Promise<void> {
        await this.mutex.acquire(mpcId);
        try {
            const state = this.state.get(mpcId);
            const session = state?.sessions.get(sessionId);
            // Guard against extension/cancellation that happened between fire
            // and mutex acquisition: a newer timer means input arrived; an
            // undefined timer means we transitioned to response-awaiting.
            if (!state || !session || session.idleTimer !== firingTimer) return;
            session.idleTimer = undefined;
            session.endedAt = Date.now();
            session.endReason = "idle-timeout";
            state.sessions.delete(sessionId);
            state.count$.next(state.sessions.size);
            if (state.sessions.size === 0) this.stopRefreshLoopLocked(state);
        } finally {
            await this.mutex.release(mpcId);
        }
    }

    private async closeSession(
        mpcId: string,
        sessionId: string,
        reason: SessionEndReason,
    ): Promise<void> {
        await this.mutex.acquire(mpcId);
        try {
            const state = this.state.get(mpcId);
            const session = state?.sessions.get(sessionId);
            if (!state || !session) return;
            if (session.idleTimer) {
                clearTimeout(session.idleTimer);
                session.idleTimer = undefined;
            }
            session.endedAt = Date.now();
            session.endReason = reason;
            state.sessions.delete(sessionId);
            state.count$.next(state.sessions.size);
            if (state.sessions.size === 0) this.stopRefreshLoopLocked(state);
        } finally {
            await this.mutex.release(mpcId);
        }
    }

    private stopRefreshLoopLocked(state: ConversationTypingState): void {
        if (state.refreshTimer) {
            clearTimeout(state.refreshTimer);
            state.refreshTimer = undefined;
        }
    }

    private refreshTick(mpcId: string): void {
        void (async () => {
            let shouldPost = false;
            await this.mutex.acquire(mpcId);
            try {
                const state = this.state.get(mpcId);
                if (!state) return;
                state.refreshTimer = undefined;
                if (state.sessions.size === 0) return;
                shouldPost = true;
                state.refreshTimer = setTimeout(
                    () => this.refreshTick(mpcId),
                    TypingIndicatorService.REFRESH_INTERVAL_MS,
                );
            } finally {
                await this.mutex.release(mpcId);
            }
            if (shouldPost) this.postTypingPing(mpcId);
        })();
    }

    private postTypingPing(mpcId: string): void {
        if (!this.localSettings.sendTyping) return;
        this.userConversationsStore
            .sendTyping(mpcId)
            .catch((err: unknown) => this.logger.error("Failed to send typing indicator:", err));
    }
}
