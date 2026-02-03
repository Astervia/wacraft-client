import { CommonModule, DOCUMENT } from "@angular/common";
import { Component, HostListener, Input, OnInit, inject } from "@angular/core";
import { SmallButtonComponent } from "../small-button/small-button.component";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { UserControllerService } from "../../../core/user/controller/user-controller.service";
import { Role } from "../../../core/user/model/role.model";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";
import { UserStoreService } from "../../../core/user/store/user-store.service";
import { WorkspaceStoreService } from "../../../core/workspace/store/workspace-store.service";
import { WorkspaceContextService } from "../../../core/workspace/store/workspace-context.service";
import { Policy } from "../../../core/workspace/model/policy.model";
import { MatTooltipModule } from "@angular/material/tooltip";
import { RoutePath } from "../../app.routes";
import { HomeFragment } from "../../home/model/home-fragment.model";
import { NavItem } from "./model/nav-item.model";
import { ShortcutsComponent } from "../../shortcuts/shortcuts.component";
import { WorkspaceSwitcherComponent } from "../workspace-switcher/workspace-switcher.component";
import { environment } from "../../../environments/environment";

@Component({
    selector: "app-sidebar",
    imports: [
        CommonModule,
        SmallButtonComponent,
        MatTooltipModule,
        RouterModule,
        ShortcutsComponent,
        WorkspaceSwitcherComponent,
    ],
    templateUrl: "./sidebar.component.html",
    styleUrl: "./sidebar.component.scss",
    standalone: true,
})
export class SidebarComponent implements OnInit {
    private route = inject(ActivatedRoute);
    queryParamsService = inject(QueryParamsService);
    userController = inject(UserControllerService);
    userStore = inject(UserStoreService);
    workspaceStore = inject(WorkspaceStoreService);
    private workspaceContext = inject(WorkspaceContextService);
    private router = inject(Router);
    private document = inject(DOCUMENT);

    // Global variables that are used in HTML and we need to define here.
    environment = environment;
    Role = Role;
    Policy = Policy;
    HomeFragment: typeof HomeFragment = HomeFragment;
    RoutePath = RoutePath;

    @Input() activePage: RoutePath | HomeFragment = RoutePath.home;

    async ngOnInit() {
        this.watchQueryParams();
    }

    watchQueryParams() {
        this.route.queryParams.subscribe(async params => {
            // Watch for sidebar query param and update.
            this.queryParamsService.sidebarOpen = params["sidebar_open"] !== "false";

            // Watch for workspace.id query param and sync with local storage.
            const urlWorkspaceId = params["workspace.id"];
            const localWorkspaceId = this.workspaceContext.currentWorkspaceId;
            if (urlWorkspaceId && urlWorkspaceId !== localWorkspaceId) {
                this.workspaceContext.setWorkspaceId(urlWorkspaceId);
                this.document.location.reload();
            }
        });
    }

    get isCollapsed(): boolean {
        return [RoutePath.account, RoutePath.automation].includes(this.activePage as RoutePath);
    }

    get isEmailVerified(): boolean {
        return !!this.userStore.currentUser?.email_verified;
    }

    get navItems(): NavItem[] {
        return [
            {
                route: ["/", RoutePath.home],
                fragment: HomeFragment.chats,
                visible: () => this.isEmailVerified,
            },
            {
                route: ["/", RoutePath.home],
                fragment: HomeFragment.templates,
                visible: () => this.isEmailVerified,
            },
            {
                route: ["/", RoutePath.home],
                fragment: HomeFragment.campaigns,
                visible: () => this.isEmailVerified,
            },
            {
                route: ["/", RoutePath.automation],
                visible: () =>
                    this.isEmailVerified && this.workspaceStore.hasPolicy(Policy.workspace_admin),
            },
            {
                route: ["/", RoutePath.webhooks],
                visible: () =>
                    this.isEmailVerified && this.workspaceStore.hasPolicy(Policy.webhook_read),
            },
            {
                route: ["/", RoutePath.workspaceSettings],
                visible: () =>
                    this.isEmailVerified &&
                    this.workspaceStore.hasPolicy(Policy.workspace_settings),
            },
            {
                route: ["/", RoutePath.workspaceMembers],
                visible: () =>
                    this.isEmailVerified && this.workspaceStore.hasPolicy(Policy.workspace_members),
            },
            {
                route: ["/", RoutePath.phoneConfigs],
                visible: () =>
                    this.isEmailVerified && this.workspaceStore.hasPolicy(Policy.phone_config_read),
            },
            {
                route: ["/", RoutePath.account],
                visible: () => true, // "account" goes at the bottom
            },
        ].filter(x => x.visible());
    }

    showShortcuts = false;
    @HostListener("window:keydown", ["$event"])
    handleHotkeys(e: KeyboardEvent) {
        // ignore while typing in inputs/textareas/content-editable
        if ((e.ctrlKey || e.metaKey) && e.key === "/") {
            e.preventDefault();
            this.showShortcuts = !this.showShortcuts;
            return;
        }
        const t = e.target as HTMLElement;
        if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable) {
            return;
        }

        const idx = Number(e.key); // "1", "2", …
        if (idx === 0)
            return this.queryParamsService.sidebarOpen
                ? this.queryParamsService.closeSidebar()
                : this.queryParamsService.openSidebar();
        if (!idx) return;
        if (idx > this.navItems.length) return;

        e.preventDefault();
        const item = this.navItems[idx - 1];
        this.router.navigate(item.route, {
            fragment: item.fragment,
            queryParams: this.queryParamsService.globalQueryParams,
            queryParamsHandling: "replace",
        });
    }
}
