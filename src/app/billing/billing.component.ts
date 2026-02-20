import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../app.routes";
import { BillingPlanStoreService } from "../../core/billing/store/billing-plan-store.service";
import { BillingSubscriptionStoreService } from "../../core/billing/store/billing-subscription-store.service";
import { BillingUsageStoreService } from "../../core/billing/store/billing-usage-store.service";
import { WorkspaceStoreService } from "../../core/workspace/store/workspace-store.service";
import { Plan } from "../../core/billing/entity/plan.entity";
import { PaymentMode, Subscription } from "../../core/billing/entity/subscription.entity";
import { UsageInfo } from "../../core/billing/entity/usage.entity";

@Component({
    selector: "app-billing",
    imports: [CommonModule, FormsModule, SidebarLayoutComponent],
    templateUrl: "./billing.component.html",
    standalone: true,
})
export class BillingComponent implements OnInit {
    planStore = inject(BillingPlanStoreService);
    subscriptionStore = inject(BillingSubscriptionStoreService);
    usageStore = inject(BillingUsageStoreService);
    workspaceStore = inject(WorkspaceStoreService);

    RoutePath = RoutePath;

    activeTab: "plans" | "subscriptions" = "plans";
    errorMessage = "";

    // Checkout state
    checkoutScope: "user" | "workspace" = "user";
    checkoutLoading = false;
    syncingSubscriptionId: string | null = null;

    async ngOnInit() {
        await Promise.all([
            this.planStore.load(),
            this.subscriptionStore.load(),
            this.usageStore.load(),
        ]);
    }

    // Usage helpers
    usagePercent(usage: {
        current_usage: number;
        throughput_limit: number;
        unlimited: boolean;
    }): number {
        if (usage.unlimited || usage.throughput_limit <= 0) return 0;
        return Math.min(100, Math.round((usage.current_usage / usage.throughput_limit) * 100));
    }

    usageColor(percent: number): string {
        if (percent > 90) return "bg-red-500";
        if (percent > 70) return "bg-yellow-500";
        return "bg-green-500";
    }

    usageTextColor(percent: number): string {
        if (percent > 90) return "text-red-600 dark:text-red-400";
        if (percent > 70) return "text-yellow-600 dark:text-yellow-400";
        return "text-green-600 dark:text-green-400";
    }

    usageLabel(usage: UsageInfo): string {
        if (usage.fallback) return "Fallback";
        return usage.scope === "workspace" ? "Workspace" : "User";
    }

    usageDescription(usage: UsageInfo): string {
        if (usage.fallback)
            return "Separate fallback budget for essential routes (billing, workspaces, profile) when the main limit is exceeded";
        if (usage.scope === "workspace") return "Usage shared between workspace members";
        return "Usage by your user account";
    }

    usageBadgeClass(usage: UsageInfo): string {
        if (usage.fallback)
            return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
        if (usage.scope === "workspace")
            return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }

    // Plan helpers
    formatPrice(cents: number, currency: string): string {
        return (cents / 100).toLocaleString(undefined, {
            style: "currency",
            currency: currency,
        });
    }

    formatThroughput(limit: number): string {
        if (limit <= 0) return "Unlimited";
        return `${limit} req`;
    }

    // Checkout
    async checkout(plan: Plan, paymentMode: PaymentMode = "payment"): Promise<void> {
        this.checkoutLoading = true;
        this.errorMessage = "";
        try {
            const workspaceId =
                this.checkoutScope === "workspace"
                    ? this.workspaceStore.currentWorkspace?.id
                    : undefined;
            const url = await this.subscriptionStore.checkout(
                plan.id,
                this.checkoutScope,
                workspaceId,
                paymentMode,
            );
            if (url) {
                window.location.href = url;
            } else {
                this.errorMessage = "Failed to initiate checkout.";
            }
        } catch {
            this.errorMessage = "Checkout failed. Please try again.";
        } finally {
            this.checkoutLoading = false;
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
        await this.subscriptionStore.cancel(sub.id);
    }

    async reactivateSubscription(sub: Subscription): Promise<void> {
        if (!confirm("Reactivate this subscription? Auto-renewal will resume.")) return;
        await this.subscriptionStore.reactivate(sub.id);
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
            await this.subscriptionStore.sync(sub.id);
        } catch {
            this.errorMessage = "Failed to sync subscription. Please try again.";
        } finally {
            this.syncingSubscriptionId = null;
        }
    }
}
