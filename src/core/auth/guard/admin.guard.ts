import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { UserStoreService } from "../../user/store/user-store.service";
import { Role } from "../../user/model/role.model";
import { RoutePath } from "../../../app/app.routes";

export const adminGuard: CanActivateFn = async () => {
    const userStore = inject(UserStoreService);
    const router = inject(Router);

    try {
        await userStore.loadCurrent();
        const isAdmin = userStore.currentUser?.role === Role.admin;

        if (!isAdmin) {
            router.navigate([RoutePath.home]);
            return false;
        }

        return true;
    } catch {
        router.navigate([RoutePath.home]);
        return false;
    }
};
