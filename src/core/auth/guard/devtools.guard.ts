import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import { RoutePath } from "../../../app/app.routes";

const DEV_ENVS = ["development", "dev", "local"];

export const devtoolsGuard: CanActivateFn = () => {
    const router = inject(Router);

    if (!DEV_ENVS.includes(environment.env)) {
        router.navigate([RoutePath.home]);
        return false;
    }

    return true;
};
