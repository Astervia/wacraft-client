import { Injectable, inject } from "@angular/core";
import axios, { AxiosInstance } from "axios";
import { AuthService } from "../../auth/service/auth.service";
import { WorkspaceContextService } from "../../workspace/store/workspace-context.service";
import { environment } from "../../../environments/environment";
import { ServerEndpoints } from "../constant/server-endpoints.enum";

@Injectable({
    providedIn: "root",
})
export class MainServerControllerService {
    protected auth = inject(AuthService);
    protected workspaceContext = inject(WorkspaceContextService);

    prefix = `http${environment.mainServerSecurity ? "s" : ""}://${environment.mainServerUrl}`;
    path: ServerEndpoints[] = [];

    http: AxiosInstance = axios.create({
        baseURL: [this.prefix, ...this.path].join("/"),
        headers: {
            Authorization: `Bearer `,
        },
    });

    constructor() {
        this.watchToken();
        this.watchWorkspace();
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
