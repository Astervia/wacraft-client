import { TestBed } from "@angular/core/testing";

import { TypingIndicatorService } from "./typing-indicator.service";
import { UserConversationsStoreService } from "../store/user-conversations-store.service";
import { LocalSettingsService } from "../../../app/local-settings.service";
import { NGXLogger } from "ngx-logger";
import { MockLogger, defer, drain } from "../../../testing";

class MockLocalSettings {
    sendTyping = true;
}

const MPC = "mpc-1";
const MPC2 = "mpc-2";

const IDLE = TypingIndicatorService.IDLE_TIMEOUT_MS;
const REFRESH = TypingIndicatorService.REFRESH_INTERVAL_MS;

describe("TypingIndicatorService", () => {
    let service: TypingIndicatorService;
    let store: jasmine.SpyObj<UserConversationsStoreService>;
    let settings: MockLocalSettings;

    beforeEach(() => {
        jasmine.clock().install();

        store = jasmine.createSpyObj<UserConversationsStoreService>(
            "UserConversationsStoreService",
            ["sendTyping"],
        );
        store.sendTyping.and.resolveTo(undefined as never);
        settings = new MockLocalSettings();

        TestBed.configureTestingModule({
            providers: [
                TypingIndicatorService,
                { provide: UserConversationsStoreService, useValue: store },
                { provide: LocalSettingsService, useValue: settings },
                { provide: NGXLogger, useClass: MockLogger },
            ],
        });
        service = TestBed.inject(TypingIndicatorService);
    });

    afterEach(() => {
        service.ngOnDestroy();
        jasmine.clock().uninstall();
    });

    async function tick(ms: number, microtaskRounds = 20): Promise<void> {
        jasmine.clock().tick(ms);
        await drain(microtaskRounds);
    }

    function collectCount(mpcId: string): number[] {
        const out: number[] = [];
        service.typingCount$(mpcId).subscribe(n => out.push(n));
        return out;
    }

    function collectIsTyping(mpcId: string): boolean[] {
        const out: boolean[] = [];
        service.isTyping$(mpcId).subscribe(v => out.push(v));
        return out;
    }

    describe("golden path", () => {
        it("opens a session on first input, emits count=1, and POSTs once", async () => {
            const counts = collectCount(MPC);
            await service.noteUserInput(MPC);
            await drain();

            expect(counts).toEqual([0, 1]);
            expect(store.sendTyping).toHaveBeenCalledTimes(1);
            expect(store.sendTyping).toHaveBeenCalledWith(MPC);
        });

        it("closes the session after 25s of idle and emits count=0", async () => {
            const counts = collectCount(MPC);
            await service.noteUserInput(MPC);
            await drain();
            expect(counts[counts.length - 1]).toBe(1);

            await tick(IDLE);
            expect(counts[counts.length - 1]).toBe(0);

            // One additional refresh-ping fires at t=20s before the t=25s idle
            // close — the service has no foresight that the session is about to
            // expire. Stops there.
            expect(store.sendTyping).toHaveBeenCalledTimes(2);
            await tick(IDLE);
            expect(store.sendTyping).toHaveBeenCalledTimes(2);
        });

        it("re-pings every 20s while the session stays alive via continued input", async () => {
            await service.noteUserInput(MPC);
            await drain();
            expect(store.sendTyping).toHaveBeenCalledTimes(1);

            // At t=5s another keystroke; idle window resets.
            await tick(5_000);
            await service.noteUserInput(MPC);
            await drain();
            expect(store.sendTyping).toHaveBeenCalledTimes(1); // no extra POST yet

            // Refresh tick at t=20s from session open.
            await tick(REFRESH - 5_000);
            expect(store.sendTyping).toHaveBeenCalledTimes(2);

            // Keep typing through t=40s.
            for (let elapsed = REFRESH; elapsed < REFRESH * 2; elapsed += 5_000) {
                await tick(5_000);
                await service.noteUserInput(MPC);
                await drain();
            }
            expect(store.sendTyping).toHaveBeenCalledTimes(3);

            // Session is still alive (last keystroke at t=40s, idle hasn't elapsed).
            const counts = collectCount(MPC);
            expect(counts[counts.length - 1]).toBe(1);
        });
    });

    describe("sendTyping disabled in settings", () => {
        it("is a complete no-op: no POST, no session, no balloon", async () => {
            settings.sendTyping = false;
            const counts = collectCount(MPC);

            await service.noteUserInput(MPC);
            await drain();
            await tick(IDLE * 2);

            expect(store.sendTyping).not.toHaveBeenCalled();
            expect(counts).toEqual([0]);
        });
    });

    describe("send + awaitResponse", () => {
        it("keeps the session alive while waiting for the response, then closes it", async () => {
            const counts = collectCount(MPC);
            await service.noteUserInput(MPC);
            await drain();
            expect(counts[counts.length - 1]).toBe(1);

            const response = defer<unknown>();
            void service.awaitResponse(MPC, response.promise);
            await drain();

            // Past the idle window — without awaitResponse, this would close it.
            await tick(IDLE + 5_000);
            expect(counts[counts.length - 1]).toBe(1);

            response.resolve(undefined);
            await drain();
            expect(counts[counts.length - 1]).toBe(0);

            // After response close, no further state changes — even if more time passes.
            const beforeExtra = counts.length;
            await tick(IDLE * 2);
            expect(counts.length).toBe(beforeExtra);
        });

        it("is a no-op when there is no active session at send-time", async () => {
            const counts = collectCount(MPC);
            const response = defer<unknown>();

            await service.awaitResponse(MPC, response.promise);
            response.resolve(undefined);
            await drain();

            expect(counts).toEqual([0]);
            expect(store.sendTyping).not.toHaveBeenCalled();
        });

        it("closes the session even if the response promise rejects", async () => {
            const counts = collectCount(MPC);
            await service.noteUserInput(MPC);
            await drain();

            const response = defer<unknown>();
            void service.awaitResponse(MPC, response.promise);
            await drain();

            response.reject(new Error("boom"));
            await drain();

            expect(counts[counts.length - 1]).toBe(0);
        });

        it("yields count=2 when user resumes typing while a previous send is in flight, then drains back to 0", async () => {
            const counts = collectCount(MPC);

            // First message: type then send.
            await service.noteUserInput(MPC);
            await drain();
            expect(counts[counts.length - 1]).toBe(1);

            const firstResponse = defer<unknown>();
            void service.awaitResponse(MPC, firstResponse.promise);
            await drain();
            expect(counts[counts.length - 1]).toBe(1);

            // Resume typing while still awaiting first response — opens a new session.
            await service.noteUserInput(MPC);
            await drain();
            expect(counts[counts.length - 1]).toBe(2);

            // First response lands — count drops to 1.
            firstResponse.resolve(undefined);
            await drain();
            expect(counts[counts.length - 1]).toBe(1);

            // Idle timeout closes the second session.
            await tick(IDLE);
            expect(counts[counts.length - 1]).toBe(0);
        });
    });

    describe("isolation across conversations", () => {
        it("keystrokes on one conversation do not affect another's state or timers", async () => {
            const countsA = collectCount(MPC);
            const countsB = collectCount(MPC2);

            await service.noteUserInput(MPC);
            await drain();
            expect(countsA[countsA.length - 1]).toBe(1);
            expect(countsB[countsB.length - 1]).toBe(0);

            await tick(IDLE);
            expect(countsA[countsA.length - 1]).toBe(0);
            expect(countsB[countsB.length - 1]).toBe(0);
        });
    });

    describe("POST failure", () => {
        it("still tracks the session locally and logs the error", async () => {
            store.sendTyping.and.rejectWith(new Error("network down"));
            const logger = TestBed.inject(NGXLogger) as unknown as MockLogger;
            const errorSpy = spyOn(logger, "error").and.callThrough();

            const counts = collectCount(MPC);
            await service.noteUserInput(MPC);
            await drain();

            expect(counts[counts.length - 1]).toBe(1);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe("concurrency", () => {
        it("collapses 50 simultaneous keystrokes into one session and one POST", async () => {
            const counts = collectCount(MPC);
            const calls = Array.from({ length: 50 }, () => service.noteUserInput(MPC));
            await Promise.all(calls);
            await drain();

            expect(counts[counts.length - 1]).toBe(1);
            expect(store.sendTyping).toHaveBeenCalledTimes(1);
        });

        it("does not double-decrement when stopAll races with a response settlement", async () => {
            const counts = collectCount(MPC);

            await service.noteUserInput(MPC);
            await drain();

            const response = defer<unknown>();
            void service.awaitResponse(MPC, response.promise);
            await drain();

            await service.stopAll(MPC);
            await drain();
            expect(counts[counts.length - 1]).toBe(0);

            // Late response should not push count negative or emit again.
            const beforeExtra = counts.length;
            response.resolve(undefined);
            await drain();
            expect(counts.length).toBe(beforeExtra);
            expect(counts[counts.length - 1]).toBe(0);
        });

        it("does not close a session whose idle timer fires after a fresh keystroke extended it", async () => {
            await service.noteUserInput(MPC);
            await drain();
            const counts = collectCount(MPC);

            // Advance close to the idle deadline, then extend just before.
            await tick(IDLE - 100);
            await service.noteUserInput(MPC);
            await drain();
            // Cross the old deadline — the old timer is cleared, so nothing fires.
            await tick(200);
            expect(counts[counts.length - 1]).toBe(1);

            // The new full window completes the close.
            await tick(IDLE - 200);
            expect(counts[counts.length - 1]).toBe(0);
        });
    });

    describe("isTyping$ emissions", () => {
        it("emits true once when going from 0 to N>0, and false once when going back to 0", async () => {
            const seen = collectIsTyping(MPC);

            await service.noteUserInput(MPC);
            await drain();
            // Open a second concurrent session (via send-while-typing).
            const r = defer<unknown>();
            void service.awaitResponse(MPC, r.promise);
            await drain();
            await service.noteUserInput(MPC);
            await drain();

            // Two sessions active; no additional `true` emission.
            expect(seen.filter(v => v).length).toBe(1);

            r.resolve(undefined);
            await drain();
            await tick(IDLE);

            expect(seen).toEqual([false, true, false]);
        });
    });

    describe("stopAll", () => {
        it("clears all sessions and resets the count to 0", async () => {
            const counts = collectCount(MPC);

            await service.noteUserInput(MPC);
            await drain();
            const r = defer<unknown>();
            void service.awaitResponse(MPC, r.promise);
            await drain();
            await service.noteUserInput(MPC);
            await drain();
            expect(counts[counts.length - 1]).toBe(2);

            await service.stopAll(MPC);
            await drain();
            expect(counts[counts.length - 1]).toBe(0);
        });
    });

    describe("ngOnDestroy", () => {
        it("clears every timer across conversations", async () => {
            await service.noteUserInput(MPC);
            await service.noteUserInput(MPC2);
            await drain();
            expect(store.sendTyping).toHaveBeenCalledTimes(2);

            service.ngOnDestroy();

            // After destroy, refresh timers and idle timers must not fire.
            await tick(IDLE * 2);
            expect(store.sendTyping).toHaveBeenCalledTimes(2);
        });
    });
});
