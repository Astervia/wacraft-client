import { TestBed } from "@angular/core/testing";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

import { BillingPlanPriceControllerService } from "./billing-plan-price-controller.service";
import { setupControllerHttp } from "../../../testing";

describe("BillingPlanPriceControllerService", () => {
    let service: BillingPlanPriceControllerService;
    let http: jasmine.SpyObj<AxiosInstance>;

    // `create`/`update`/`delete` go through `requestWithoutWorkspace`, which calls the
    // default `axios.request` directly so the X-Workspace-ID header is omitted (plan
    // prices are platform-global). The shared helper stubs that spy.
    const lastRequest = () =>
        (axios.request as jasmine.Spy).calls.mostRecent().args[0] as AxiosRequestConfig;

    beforeEach(() => {
        http = setupControllerHttp();
        service = TestBed.inject(BillingPlanPriceControllerService);
    });

    afterEach(() => localStorage.clear());

    it("get GETs plan/{id}/price with default pagination of 50", async () => {
        await service.get("plan-1");
        const args = http.get.calls.mostRecent().args;
        expect(args[0]).toContain("plan/plan-1/price");
        expect((args[1] as { params: Record<string, unknown> }).params).toEqual(
            jasmine.objectContaining({ limit: 50, offset: 0 }),
        );
    });

    it("create POSTs to plan/{id}/price without a workspace header", async () => {
        await service.create("plan-1", { amount: 100 } as never);
        const req = lastRequest();
        expect(req.method).toBe("post");
        expect(req.url).toContain("plan/plan-1/price");
        expect(req.data).toEqual({ amount: 100 } as never);
        expect(req.headers?.["X-Workspace-ID"]).toBeUndefined();
    });

    it("update PUTs with id query", async () => {
        await service.update("plan-1", "price-9", { amount: 200 } as never);
        const req = lastRequest();
        expect(req.method).toBe("put");
        expect(req.url).toContain("plan/plan-1/price");
        expect(req.params).toEqual({ id: "price-9" });
    });

    it("delete sends DELETE with id query", async () => {
        await service.delete("plan-1", "price-9");
        const req = lastRequest();
        expect(req.method).toBe("delete");
        expect(req.url).toContain("plan/plan-1/price");
        expect(req.params).toEqual({ id: "price-9" });
    });
});
