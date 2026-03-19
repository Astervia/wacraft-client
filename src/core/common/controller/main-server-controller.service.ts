import { Injectable, inject } from "@angular/core";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs";
import { AuthService } from "../../auth/service/auth.service";
import { WorkspaceContextService } from "../../workspace/store/workspace-context.service";
import { environment } from "../../../environments/environment";
import { ServerEndpoints } from "../constant/server-endpoints.enum";
import { RoutePath } from "../../../app/app.routes";

@Injectable({
    providedIn: "root",
})
export class MainServerControllerService {
    protected auth = inject(AuthService);
    protected workspaceContext = inject(WorkspaceContextService);
    private router = inject(Router);

    prefix = `http${environment.mainServerSecurity ? "s" : ""}://${environment.mainServerUrl}`;
    path: ServerEndpoints[] = [];
    private billingRedirectInProgress = false;
    private verifyEmailRedirectInProgress = false;

    http: AxiosInstance = axios.create({
        baseURL: [this.prefix, ...this.path].join("/"),
        headers: {
            Authorization: `Bearer `,
        },
    });

    constructor() {
        this.attachInterceptors();
        this.watchToken();
        this.watchWorkspace();
        this.watchBillingRedirect();
        this.watchVerifyEmailRedirect();
    }

    setPath(...path: ServerEndpoints[]): void {
        this.path = path;
    }

    setHttp(token: string | null = localStorage.getItem("accessToken")): void {
        if (!token) return;
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
        };
        const workspaceId = this.workspaceContext.currentWorkspaceId;
        if (workspaceId) {
            headers["X-Workspace-ID"] = workspaceId;
        }
        this.http = axios.create({
            baseURL: [this.prefix, ...this.path].join("/"),
            headers,
        });
        this.attachInterceptors();
    }

    private attachInterceptors(): void {
        this.http.interceptors.response.use(undefined, error => {
            if (
                error?.response?.status === 429 &&
                error?.response?.data?.context === "billing" &&
                !this.billingRedirectInProgress &&
                !this.router.url.startsWith(`/${RoutePath.billing}`) &&
                !this.router.url.startsWith(`/${RoutePath.auth}`)
            ) {
                this.billingRedirectInProgress = true;
                this.router.navigate([`/${RoutePath.billing}`]);
            }
            if (
                error?.response?.status === 403 &&
                error?.response?.data?.message === "Email verification required" &&
                !this.verifyEmailRedirectInProgress &&
                !this.router.url.startsWith(`/${RoutePath.verifyEmailRequired}`) &&
                !this.router.url.startsWith(`/${RoutePath.auth}`)
            ) {
                this.verifyEmailRedirectInProgress = true;
                this.router.navigate([`/${RoutePath.verifyEmailRequired}`]);
            }
            return Promise.reject(error);
        });
    }

    private watchBillingRedirect(): void {
        this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
            this.billingRedirectInProgress = false;
        });
    }

    private watchVerifyEmailRedirect(): void {
        this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
            this.verifyEmailRedirectInProgress = false;
        });
    }

    protected requestWithoutWorkspace<T>(
        method: "get" | "post" | "put" | "delete",
        url: string,
        config: AxiosRequestConfig = {},
    ) {
        const token = localStorage.getItem("accessToken");
        const baseURL = [this.prefix, ...this.path].join("/");
        return axios.request<T>({
            method,
            url: `${baseURL}/${url}`,
            ...config,
            headers: {
                Authorization: `Bearer ${token}`,
                ...config.headers,
            },
        });
    }

    watchToken(): void {
        this.auth.token.subscribe(token => {
            this.setHttp(token);
        });
    }

    watchWorkspace(): void {
        this.workspaceContext.workspaceChanged.subscribe(() => {
            this.setHttp();
        });
    }
}
