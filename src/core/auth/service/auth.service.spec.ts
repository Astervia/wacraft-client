import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import axios, { AxiosInstance } from "axios";
import { AuthService } from "./auth.service";
import { GrantType } from "../enum/grant-type.enum";
import { TokenResponse } from "../model/token-response.model";

describe("AuthService", () => {
    let service: AuthService;
    let router: jasmine.SpyObj<Router>;
    let http: jasmine.SpyObj<AxiosInstance>;
    let axiosCreateSpy: jasmine.Spy;

    const tokenResponse: TokenResponse = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        token_type: "Bearer" as TokenResponse["token_type"],
        expires_in: 3600,
    };
    const timeoutHandle = {} as ReturnType<typeof setTimeout>;

    beforeEach(() => {
        localStorage.clear();

        router = jasmine.createSpyObj<Router>("Router", ["navigate"]);
        http = jasmine.createSpyObj<AxiosInstance>("AxiosInstance", ["post"]);
        axiosCreateSpy = spyOn(axios, "create").and.returnValue(http);

        TestBed.configureTestingModule({
            providers: [AuthService, { provide: Router, useValue: router }],
        });

        service = TestBed.inject(AuthService);
    });

    afterEach(() => {
        localStorage.clear();
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
        expect(axiosCreateSpy).toHaveBeenCalled();
    });

    it("should login, persist tokens, update login time, and schedule refresh", async () => {
        http.post.and.resolveTo({ data: tokenResponse });
        const setTimeoutSpy = spyOn(window, "setTimeout").and.returnValue(timeoutHandle);
        const tokenSpy = spyOn(service.token, "next").and.callThrough();

        const response = await service.login("alice", "secret");

        expect(http.post).toHaveBeenCalledOnceWith("token", {
            username: "alice",
            password: "secret",
            grant_type: GrantType.password,
        });
        expect(response).toEqual(tokenResponse);
        expect(tokenSpy).toHaveBeenCalledOnceWith("access-token");
        expect(service.getToken()).toBe("access-token");
        expect(localStorage.getItem("refreshToken")).toBe("refresh-token");
        expect(localStorage.getItem("loginTime")).not.toBeNull();
        expect(setTimeoutSpy).toHaveBeenCalledOnceWith(jasmine.any(Function), 3590000);
    });

    it("should refresh the token only once while a refresh is already in progress", async () => {
        let resolveRequest!: (value: { data: TokenResponse }) => void;
        http.post.and.returnValue(
            new Promise(resolve => {
                resolveRequest = resolve;
            }) as ReturnType<AxiosInstance["post"]>,
        );
        localStorage.setItem("refreshToken", "stored-refresh-token");

        const firstRefresh = service.refreshAuthToken();
        const secondRefresh = service.refreshAuthToken();

        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.post).toHaveBeenCalledWith("token", {
            refresh_token: "stored-refresh-token",
            grant_type: GrantType.refresh_token,
        });

        resolveRequest({ data: tokenResponse });
        const [firstResponse, secondResponse] = await Promise.all([firstRefresh, secondRefresh]);

        expect(firstResponse).toEqual(tokenResponse);
        expect(secondResponse).toEqual(tokenResponse);
        expect(service.getToken()).toBe("access-token");
        expect(localStorage.getItem("refreshToken")).toBe("refresh-token");

        http.post.calls.reset();
        http.post.and.resolveTo({ data: tokenResponse });

        await service.refreshAuthToken();
        expect(http.post).toHaveBeenCalledTimes(1);
    });

    it("should refresh immediately and reschedule when the token is close to expiry", async () => {
        http.post.and.resolveTo({ data: tokenResponse });
        localStorage.setItem("loginTime", (Date.now() - 3590000).toString());
        const scheduleSpy = spyOn(window, "setTimeout").and.returnValue(timeoutHandle);

        await service.checkAndRefreshToken();

        expect(http.post).toHaveBeenCalledOnceWith("token", {
            refresh_token: null,
            grant_type: GrantType.refresh_token,
        });
        expect(scheduleSpy).toHaveBeenCalledOnceWith(jasmine.any(Function), 3590000);
    });

    it("should schedule a future refresh when the token is still fresh", async () => {
        const setTimeoutSpy = spyOn(window, "setTimeout").and.returnValue(timeoutHandle);
        localStorage.setItem("loginTime", (Date.now() - 1000).toString());

        await service.checkAndRefreshToken();

        expect(http.post).not.toHaveBeenCalled();
        expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
        const delay = setTimeoutSpy.calls.mostRecent().args[1] as number | undefined;
        expect(delay).toBeGreaterThanOrEqual(3588999);
        expect(delay).toBeLessThanOrEqual(3589000);
    });

    it("should logout when an immediate refresh attempt fails", async () => {
        localStorage.setItem("accessToken", "access-token");
        localStorage.setItem("refreshToken", "refresh-token");
        localStorage.setItem("loginTime", (Date.now() - 3590000).toString());
        http.post.and.rejectWith(new Error("refresh failed"));
        await service.checkAndRefreshToken();

        expect(service.getToken()).toBe("");
        expect(localStorage.getItem("refreshToken")).toBeNull();
        expect(service.loginTime).toBe(0);
        expect(router.navigate).toHaveBeenCalledWith(["/auth/login"]);
    });

    it("should call the reset password endpoint", async () => {
        http.post.and.resolveTo({ data: undefined });

        await service.resetPassword("alice@example.com");

        expect(http.post).toHaveBeenCalledOnceWith("reset-password", {
            username: "alice@example.com",
        });
    });

    it("should persist and clear loginTime", () => {
        const loginDate = new Date("2024-01-01T12:00:00.000Z");

        service.loginTime = loginDate;
        expect(service.loginTime).toBe(loginDate.getTime());
        expect(localStorage.getItem("loginTime")).toBe(loginDate.getTime().toString());

        service.loginTime = undefined;
        expect(service.loginTime).toBe(0);
        expect(localStorage.getItem("loginTime")).toBeNull();
    });
});
