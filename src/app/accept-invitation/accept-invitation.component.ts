import { Component, inject, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { RoutePath } from "../app.routes";

@Component({
    selector: "app-accept-invitation",
    template: "",
    standalone: true,
})
export class AcceptInvitationComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    ngOnInit(): void {
        const token = this.route.snapshot.queryParams["token"] || "";
        if (token) {
            this.router.navigate([`/${RoutePath.invitation}`], { queryParams: { token } });
        } else {
            this.router.navigate([`/${RoutePath.auth}/${RoutePath.login}`]);
        }
    }
}
