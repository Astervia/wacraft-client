import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { UserStoreService } from "../../user/store/user-store.service";
import { RoutePath } from "../../../app/app.routes";
import { userGuard } from "./user.guard";

export const emailVerifiedGuard: CanActivateFn = async (route, state) => {
    const userStore = inject(UserStoreService);
    const router = inject(Router);

    await userGuard(route, state);

    if (!userStore.currentUser?.email_verified) {
        return router.createUrlTree([`/${RoutePath.verifyEmailRequired}`]);
    }

    return true;
};
