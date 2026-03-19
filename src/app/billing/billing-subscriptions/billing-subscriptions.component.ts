import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { BillingSubscriptionStoreService } from "../../../core/billing/store/billing-subscription-store.service";
import { WorkspaceStoreService } from "../../../core/workspace/store/workspace-store.service";
import { Subscription } from "../../../core/billing/entity/subscription.entity";
import { Policy } from "../../../core/workspace/model/policy.model";

@Component({
    selector: "app-billing-subscriptions",
    imports: [CommonModule],
    templateUrl: "./billing-subscriptions.component.html",
    standalone: true,
})
export class BillingSubscriptionsComponent implements OnInit {
    subscriptionStore = inject(BillingSubscriptionStoreService);
    workspaceStore = inject(WorkspaceStoreService);

    errorMessage = "";
    private scrolling = false;

    syncingSubscriptionId: string | null = null;

    // Subscription scope
    subscriptionScope: "user" | "workspace" = "user";

    get activeSubscriptions(): Subscription[] {
        return this.subscriptionScope === "workspace"
            ? this.subscriptionStore.workspaceSubscriptions
            : this.subscriptionStore.userSubscriptions;
    }

    get reachedMaxSubscriptionLimit(): boolean {
        return this.subscriptionScope === "workspace"
            ? this.subscriptionStore.reachedMaxWorkspaceLimit
            : this.subscriptionStore.reachedMaxUserLimit;
    }

    get canViewWorkspaceSubscriptions(): boolean {
        return (
            this.workspaceStore.hasPolicy(Policy.billing_read) ||
            this.workspaceStore.hasPolicy(Policy.workspace_admin)
        );
    }

    onScroll(event: Event): void {
        const element = event.target as HTMLElement;
        if (
            !(
                element.scrollHeight - element.scrollTop <= element.clientHeight + 100 &&
                !this.scrolling
            )
        )
            return;

        if (!this.reachedMaxSubscriptionLimit) {
            this.getMoreSubscriptions();
        }
    }

    async getMoreSubscriptions(): Promise<void> {
        this.scrolling = true;
        try {
            if (this.subscriptionScope === "workspace") {
                await this.subscriptionStore.getWorkspaceSubscriptions();
            } else {
                await this.subscriptionStore.getUserSubscriptions();
            }
        } finally {
            this.scrolling = false;
        }
    }

    async ngOnInit() {
        await this.subscriptionStore.loadUserSubscriptions();
    }

    async selectSubscriptionScope(scope: "user" | "workspace"): Promise<void> {
        this.subscriptionScope = scope;
        if (scope === "user" && this.subscriptionStore.userSubscriptions.length === 0) {
            await this.subscriptionStore.loadUserSubscriptions();
        }
        if (scope === "workspace" && this.subscriptionStore.workspaceSubscriptions.length === 0) {
            await this.subscriptionStore.loadWorkspaceSubscriptions();
        }
    }

    // Subscription status
    subscriptionStatus(
        sub: Pick<Subscription, "status" | "cancelled_at" | "cancel_at_period_end" | "expires_at">,
    ): "pending" | "active" | "cancelling" | "cancelled" | "expired" {
        if (sub.status === "pending") return "pending";
        if (sub.status === "cancelled" || sub.cancelled_at) return "cancelled";
        if (sub.cancel_at_period_end) return "cancelling";
        if (new Date(sub.expires_at) < new Date()) return "expired";
        return "active";
    }

    subscriptionStatusLabel(sub: Subscription): string {
        const status = this.subscriptionStatus(sub);
        if (status === "pending") return "Awaiting payment confirmation";
        if (status === "cancelled") return "Cancelled";
        if (status === "cancelling") {
            return (
                "Cancellation pending — Active until " +
                new Date(sub.expires_at).toLocaleDateString()
            );
        }
        if (status === "expired") return "Expired";
        if (sub.payment_mode === "subscription") {
            return "Active — Renews on " + new Date(sub.expires_at).toLocaleDateString();
        }
        return "Active — Expires on " + new Date(sub.expires_at).toLocaleDateString();
    }

    canCancel(sub: Subscription): boolean {
        return (
            sub.status === "active" &&
            sub.payment_mode === "subscription" &&
            !sub.cancelled_at &&
            !sub.cancel_at_period_end &&
            new Date(sub.expires_at) > new Date()
        );
    }

    statusBadgeClass(status: string): string {
        switch (status) {
            case "pending":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
            case "active":
                return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
            case "cancelling":
                return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
            case "cancelled":
                return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
            case "expired":
                return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
        }
    }

    canReactivate(sub: Subscription): boolean {
        return (
            sub.status === "active" &&
            sub.payment_mode === "subscription" &&
            sub.cancel_at_period_end &&
            !sub.cancelled_at &&
            new Date(sub.expires_at) > new Date()
        );
    }

    async cancelSubscription(sub: Subscription): Promise<void> {
        const expiresAt = new Date(sub.expires_at).toLocaleDateString();
        if (
            !confirm(
                `Are you sure you want to cancel this subscription? It will remain active until ${expiresAt} and you will not be charged again.`,
            )
        )
            return;
        await this.subscriptionStore.cancel(sub.id, this.subscriptionScope === "workspace");
    }

    async reactivateSubscription(sub: Subscription): Promise<void> {
        if (!confirm("Reactivate this subscription? Auto-renewal will resume.")) return;
        await this.subscriptionStore.reactivate(sub.id, this.subscriptionScope === "workspace");
    }

    canSync(sub: Subscription): boolean {
        if (sub.status === "pending") return true;
        return (
            sub.status === "active" &&
            sub.payment_mode === "subscription" &&
            !!sub.stripe_subscription_id
        );
    }

    syncButtonLabel(sub: Subscription): string {
        if (sub.status === "pending") return "Check payment status";
        return "Sync";
    }

    async syncSubscription(sub: Subscription): Promise<void> {
        this.syncingSubscriptionId = sub.id;
        this.errorMessage = "";
        try {
            await this.subscriptionStore.sync(sub.id, this.subscriptionScope === "workspace");
        } catch {
            this.errorMessage = "Failed to sync subscription. Please try again.";
        } finally {
            this.syncingSubscriptionId = null;
        }
    }
}
