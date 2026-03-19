import { getCurrency } from "locale-currency";
import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { BillingPlanStoreService } from "../../../core/billing/store/billing-plan-store.service";
import { BillingSubscriptionStoreService } from "../../../core/billing/store/billing-subscription-store.service";
import { BillingUsageStoreService } from "../../../core/billing/store/billing-usage-store.service";
import { WorkspaceStoreService } from "../../../core/workspace/store/workspace-store.service";
import { Plan } from "../../../core/billing/entity/plan.entity";
import { PlanPrice } from "../../../core/billing/entity/plan-price.entity";
import { PaymentMode } from "../../../core/billing/entity/subscription.entity";
import { UsageInfo } from "../../../core/billing/entity/usage.entity";

@Component({
    selector: "app-billing-plans",
    imports: [CommonModule, FormsModule],
    templateUrl: "./billing-plans.component.html",
    standalone: true,
})
export class BillingPlansComponent implements OnInit {
    planStore = inject(BillingPlanStoreService);
    subscriptionStore = inject(BillingSubscriptionStoreService);
    usageStore = inject(BillingUsageStoreService);
    workspaceStore = inject(WorkspaceStoreService);

    errorMessage = "";
    private scrolling = false;

    // Checkout state
    checkoutScope: "user" | "workspace" = "user";
    checkoutLoading = false;

    // Preferred currency — single global selection, persisted
    preferredCurrency = "";

    private readonly STORAGE_KEY = "preferred_currency";

    // All distinct currencies offered across active plans
    get availableCurrencies(): string[] {
        const seen = new Set<string>();
        for (const plan of this.planStore.plans) {
            if (!plan.active) continue;
            for (const p of plan.prices) seen.add(p.currency.toLowerCase());
        }
        return [...seen].sort();
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

        if (!this.planStore.reachedMaxLimit) {
            this.getMorePlans();
        }
    }

    async getMorePlans(): Promise<void> {
        this.scrolling = true;
        try {
            await this.planStore.get();
        } finally {
            this.scrolling = false;
        }
    }

    async ngOnInit() {
        await Promise.all([this.planStore.load(), this.usageStore.load()]);

        this.initPreferredCurrency();
    }

    private initPreferredCurrency(): void {
        const available = this.availableCurrencies;
        if (available.length === 0) return;

        // 1. Restore from localStorage
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved && available.includes(saved)) {
            this.preferredCurrency = saved;
            return;
        }

        // 2. Auto-detect from browser locale
        const detected = this.detectLocaleCurrency();
        if (detected && available.includes(detected)) {
            this.preferredCurrency = detected;
            return;
        }

        // 3. Fall back to the most common currency across plans (highest occurrence)
        const counts = new Map<string, number>();
        for (const plan of this.planStore.plans) {
            if (!plan.active) continue;
            for (const p of plan.prices) {
                const c = p.currency.toLowerCase();
                counts.set(c, (counts.get(c) ?? 0) + 1);
            }
        }
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        if (top) this.preferredCurrency = top[0];
    }

    private detectLocaleCurrency(): string | null {
        try {
            const code = getCurrency(navigator.language);
            return code ? code.toLowerCase() : null;
        } catch {
            return null;
        }
    }

    setPreferredCurrency(currency: string): void {
        this.preferredCurrency = currency;
        localStorage.setItem(this.STORAGE_KEY, currency);
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
            currency: currency.toUpperCase(),
        });
    }

    private defaultPrice(plan: Plan): PlanPrice | undefined {
        return plan.prices.find(p => p.is_default) ?? plan.prices[0];
    }

    selectedPrice(plan: Plan): PlanPrice | undefined {
        if (this.preferredCurrency) {
            const match = plan.prices.find(
                p => p.currency.toLowerCase() === this.preferredCurrency,
            );
            if (match) return match;
        }
        return this.defaultPrice(plan);
    }

    // True when the shown price is the plan default, not the user's preferred currency
    isUsingFallback(plan: Plan): boolean {
        if (!this.preferredCurrency || plan.prices.length === 0) return false;
        return !plan.prices.some(p => p.currency.toLowerCase() === this.preferredCurrency);
    }

    formatSelectedPrice(plan: Plan): string {
        const price = this.selectedPrice(plan);
        if (!price) return "—";
        return this.formatPrice(price.price_cents, price.currency);
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
            const price = this.selectedPrice(plan);
            const url = await this.subscriptionStore.checkout(
                plan.id,
                this.checkoutScope,
                workspaceId,
                paymentMode,
                price?.currency,
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
}
