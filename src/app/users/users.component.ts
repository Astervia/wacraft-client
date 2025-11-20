
import { Component, HostListener, inject } from "@angular/core";
import { SidebarComponent } from "../common/sidebar/sidebar.component";
import { RoutePath } from "../app.routes";
import { QueryParamsService } from "../../core/navigation/service/query-params.service";
import { UserSidebarComponent } from "./user-sidebar/user-sidebar.component";
import { UserDetailsComponent } from "./user-details/user-details.component";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
    selector: "app-users",
    imports: [SidebarComponent, UserSidebarComponent, UserDetailsComponent],
    templateUrl: "./users.component.html",
    styleUrl: "./users.component.scss",
    standalone: true,
})
export class UsersComponent {
    queryParamsService = inject(QueryParamsService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    RoutePath = RoutePath;

    /** Close / clean-up when Esc is pressed */
    @HostListener("window:keydown.escape")
    private removeQueryParam(): void {
        this.router.navigate(
            [], // keep current URL
            {
                relativeTo: this.route,
                queryParams: {
                    // null → “delete”
                    ["user.id"]: null,
                },
                preserveFragment: true,
                queryParamsHandling: "merge", // leave the rest intact
            },
        );
    }
}
