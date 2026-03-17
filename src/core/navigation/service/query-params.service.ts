import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { WorkspaceContextService } from "../../workspace/store/workspace-context.service";

@Injectable({
    providedIn: "root",
})
export class QueryParamsService {
    private router = inject(Router);
    private workspaceContext = inject(WorkspaceContextService);

    // Global query params
    public sidebarOpen = false; // Handled by query params.
    closeSidebar() {
        this.router.navigate([], {
            queryParams: {
                sidebar_open: false,
            },
            preserveFragment: true,
            queryParamsHandling: "merge",
        });
    }
    openSidebar() {
        this.router.navigate([], {
            queryParams: {
                sidebar_open: true,
            },
            preserveFragment: true,
            queryParamsHandling: "merge",
        });
    }

    public devMode = false; // Handled by query params.
    toggleDevMode() {
        this.router.navigate([], {
            queryParams: {
                dev: this.devMode ? null : true,
            },
            preserveFragment: true,
            queryParamsHandling: "merge",
        });
    }

    get globalQueryParams() {
        return {
            sidebar_open: this.sidebarOpen,
            "workspace.id": this.workspaceContext.currentWorkspaceId,
            dev: this.devMode ? true : null,
        };
    }
}
