import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../../core/common/constant/route-path.enum";
import { BillingPlansComponent } from "./billing-plans/billing-plans.component";
import { BillingSubscriptionsComponent } from "./billing-subscriptions/billing-subscriptions.component";
import { PaymentsComponent } from "../payments/payments.component";

@Component({
    selector: "app-billing",
    imports: [
        CommonModule,
        RouterLink,
        SidebarLayoutComponent,
        BillingPlansComponent,
        BillingSubscriptionsComponent,
        PaymentsComponent,
    ],
    templateUrl: "./billing.component.html",
    standalone: true,
})
export class BillingComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    RoutePath = RoutePath;

    activeTab: "plans" | "subscriptions" | "payments" = "plans";

    ngOnInit() {
        this.route.fragment.subscribe(fragment => {
            if (fragment === "subscriptions") this.activeTab = "subscriptions";
            else if (fragment === "payments") this.activeTab = "payments";
            else {
                this.activeTab = "plans";
                if (fragment !== "plans")
                    this.router.navigate([], {
                        fragment: "plans",
                        replaceUrl: true,
                        queryParamsHandling: "preserve",
                    });
            }
        });
    }
}
