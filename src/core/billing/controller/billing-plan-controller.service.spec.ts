import { TestBed } from "@angular/core/testing";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

import { BillingPlanControllerService } from "./billing-plan-controller.service";
import { setupControllerHttp } from "../../../testing";

describe("BillingPlanControllerService", () => {
    let service: BillingPlanControllerService;
    let http: jasmine.SpyObj<AxiosInstance>;

    // `create`/`update`/`delete` go through `requestWithoutWorkspace`, which calls the
    // default `axios.request` directly so the X-Workspace-ID header is omitted (plans
    // are platform-global). The shared helper stubs that spy.
    const lastRequest = () =>
        (axios.request as jasmine.Spy).calls.mostRecent().args[0] as AxiosRequestConfig;

    beforeEach(() => {
        http = setupControllerHttp();
        service = TestBed.inject(BillingPlanControllerService);
    });

    afterEach(() => localStorage.clear());

    it("get GETs plan with default pagination of 50", async () => {
        await service.get();
        const args = http.get.calls.mostRecent().args;
        expect(args[0]).toContain("plan");
        expect((args[1] as { params: Record<string, unknown> }).params).toEqual(
            jasmine.objectContaining({ limit: 50, offset: 0 }),
        );
    });

    it("create POSTs the plan payload without a workspace header", async () => {
        await service.create({ name: "Pro" } as never);
        const req = lastRequest();
        expect(req.method).toBe("post");
        expect(req.url).toContain("plan");
        expect(req.data).toEqual({ name: "Pro" } as never);
        expect(req.headers?.["X-Workspace-ID"]).toBeUndefined();
    });

    it("update PUTs the payload with id query", async () => {
        await service.update("p1", { name: "Pro+" } as never);
        const req = lastRequest();
        expect(req.method).toBe("put");
        expect(req.url).toContain("plan");
        expect(req.params).toEqual({ id: "p1" });
    });

    it("delete sends DELETE with id param", async () => {
        await service.delete("p1");
        const req = lastRequest();
        expect(req.method).toBe("delete");
        expect(req.params).toEqual({ id: "p1" });
    });
});
