import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../app.routes";
import { BillingSubscriptionStoreService } from "../../core/billing/store/billing-subscription-store.service";

@Component({
    selector: "app-billing-success",
    imports: [CommonModule, RouterModule, SidebarLayoutComponent],
    templateUrl: "./billing-success.component.html",
    standalone: true,
})
export class BillingSuccessComponent implements OnInit {
    subscriptionStore = inject(BillingSubscriptionStoreService);
    RoutePath = RoutePath;

    async ngOnInit() {
        await this.subscriptionStore.load();
    }
}
