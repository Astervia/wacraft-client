import { Injectable, inject } from "@angular/core";
import axios, { AxiosInstance } from "axios";
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
            return Promise.reject(error);
        });
    }

    private watchBillingRedirect(): void {
        this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
            this.billingRedirectInProgress = false;
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
