import { Routes } from "@angular/router";
import { LoginComponent } from "./login/login.component";
import { userGuard } from "./../core/auth/guard/user.guard";
import { adminGuard } from "./../core/auth/guard/admin.guard";
import { HomeComponent } from "./home/home.component";
import { PluginsManagerService } from "../plugins/common/service/plugins-manager.service";
import { AccountComponent } from "./account/account.component";
import { WebhooksComponent } from "./webhooks/webhooks.component";
import { UsersComponent } from "./users/users.component";
import { AutomationComponent } from "./automation/automation.component";
import { WorkspaceSettingsComponent } from "./workspace-settings/workspace-settings.component";
import { WorkspaceMembersComponent } from "./workspace-members/workspace-members.component";
import { PhoneConfigsComponent } from "./phone-configs/phone-configs.component";
import { RegisterComponent } from "./register/register.component";
import { VerifyEmailComponent } from "./verify-email/verify-email.component";
import { ForgotPasswordComponent } from "./forgot-password/forgot-password.component";
import { ResetPasswordComponent } from "./reset-password/reset-password.component";
import { AcceptInvitationComponent } from "./accept-invitation/accept-invitation.component";
import { environment } from "../environments/environment";

export enum RoutePath {
    home = "home",
    account = "account",
    auth = "auth",
    login = "login",
    webhooks = "webhooks",
    users = "users",
    automation = "automation",
    workspaceSettings = "workspace-settings",
    workspaceMembers = "workspace-members",
    phoneConfigs = "phone-configs",
    register = "register",
    verifyEmail = "verify-email",
    forgotPassword = "forgot-password",
    resetPassword = "reset-password",
    acceptInvitation = "accept-invitation",
}

export const routes: Routes = [
    // Public auth routes
    {
        path: `${RoutePath.auth}/${RoutePath.login}`,
        component: LoginComponent,
    },
    {
        path: `${RoutePath.auth}/${RoutePath.register}`,
        component: RegisterComponent,
    },
    {
        path: `${RoutePath.auth}/${RoutePath.verifyEmail}`,
        component: VerifyEmailComponent,
    },
    {
        path: `${RoutePath.auth}/${RoutePath.forgotPassword}`,
        component: ForgotPasswordComponent,
    },
    {
        path: `${RoutePath.auth}/${RoutePath.resetPassword}`,
        component: ResetPasswordComponent,
    },
    {
        path: `${RoutePath.auth}/${RoutePath.acceptInvitation}`,
        component: AcceptInvitationComponent,
    },
    // Protected routes
    {
        path: RoutePath.home,
        component: HomeComponent,
        canActivate: [userGuard],
    },
    {
        path: RoutePath.account,
        component: AccountComponent,
        canActivate: [userGuard],
    },
    {
        path: RoutePath.webhooks,
        component: WebhooksComponent,
        canActivate: [userGuard],
    },
    {
        path: RoutePath.users,
        component: UsersComponent,
        canActivate: [userGuard, adminGuard],
    },
    {
        path: RoutePath.workspaceSettings,
        component: WorkspaceSettingsComponent,
        canActivate: [userGuard],
    },
    {
        path: RoutePath.workspaceMembers,
        component: WorkspaceMembersComponent,
        canActivate: [userGuard],
    },
    {
        path: RoutePath.phoneConfigs,
        component: PhoneConfigsComponent,
        canActivate: [userGuard],
    },
    environment.isLite
        ? {
              path: RoutePath.automation,
              pathMatch: "full",
          }
        : {
              path: RoutePath.automation,
              component: AutomationComponent,
              canActivate: [userGuard],
          },
    {
        path: "",
        redirectTo: RoutePath.home,
        pathMatch: "full",
    },
];

export function routesWithPluginsFactory(pluginManager: PluginsManagerService): Routes {
    pluginManager.loadPlugins(); // If synchronous

    // Remove for now while we don't have plugins
    // const pluginRoutes = pluginManager.plugins.map(plugin => ({
    //     path: plugin.path,
    //     loadChildren: plugin.moduleLoader,
    // }));

    return [...routes]; // ...pluginRoutes]; Remove for now while we don't have plugins
}
