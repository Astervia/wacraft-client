import { Role } from "../../../../core/user/model/role.model";
import { RoutePath } from "../../../app.routes";
import { HomeFragment } from "../../../home/model/home-fragment.model";

export const navItems: NavItem[] = [
    {
        route: ["/", RoutePath.home],
        fragment: HomeFragment.chats,
        visible: () => true,
    },
    {
        route: ["/", RoutePath.home],
        fragment: HomeFragment.templates,
        visible: () => true,
    },
    {
        route: ["/", RoutePath.home],
        fragment: HomeFragment.campaigns,
        visible: () => true,
    },
    {
        route: ["/", RoutePath.webhooks],
        visible: () =>
            !!this.userStore.currentUser &&
            [Role.admin, Role.developer, Role.automation].includes(this.userStore.currentUser.role),
    },
    {
        route: ["/", RoutePath.users],
        visible: () =>
            !!this.userStore.currentUser && this.userStore.currentUser.role === Role.admin,
    },
    {
        route: ["/", RoutePath.account],
        visible: () => true, // “account” goes at the bottom
    },
].filter(x => x.visible());
