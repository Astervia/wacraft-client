import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../service/auth.service";
import { UserStoreService } from "../../user/store/user-store.service";
import { WorkspaceStoreService } from "../../workspace/store/workspace-store.service";
import { RoutePath } from "../../../app/app.routes";

export const userGuard: CanActivateFn = async (route, state) => {
    const authService = inject(AuthService);
    const userStore = inject(UserStoreService);
    const workspaceStore = inject(WorkspaceStoreService);
    const router = inject(Router);

    const queryParams = new URLSearchParams(state.url.split("?")[1]);
    const token = queryParams.get("access_token");

    if (token) {
        authService.setToken(token);
        authService.loginTime = new Date();
    }

    try {
        await authService.checkAndRefreshToken();

        if (!authService.getToken()) {
            return router.createUrlTree([`/${RoutePath.auth}/${RoutePath.login}`]);
        }

        const me = await userStore
            .getCurrent()
            .then(() => true)
            .catch(() => router.createUrlTree([`/${RoutePath.auth}/${RoutePath.login}`]));

        if (me !== true) return me;

        // Load workspaces and restore the current workspace
        await workspaceStore.loadWorkspaces();
        if (!workspaceStore.currentWorkspace) {
            workspaceStore.restoreWorkspace();
        }

        return true;
    } catch {
        return router.createUrlTree([`/${RoutePath.auth}/${RoutePath.login}`]);
    }
};
