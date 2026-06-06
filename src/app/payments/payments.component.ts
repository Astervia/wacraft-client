import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { BillingPaymentStoreService } from "../../core/billing/store/billing-payment-store.service";
import { WorkspaceStoreService } from "../../core/workspace/store/workspace-store.service";
import { Payment } from "../../core/billing/entity/payment.entity";
import { Policy } from "../../core/workspace/model/policy.model";
import { LocalSettingsService } from "../local-settings.service";

@Component({
    selector: "app-payments",
    imports: [CommonModule],
    templateUrl: "./payments.component.html",
    standalone: true,
})
export class PaymentsComponent implements OnInit {
    paymentStore = inject(BillingPaymentStoreService);
    workspaceStore = inject(WorkspaceStoreService);
    private localSettings = inject(LocalSettingsService);

    errorMessage = "";
    private scrolling = false;

    paymentScope: "user" | "workspace" = "user";

    get payments(): Payment[] {
        return this.paymentScope === "workspace"
            ? this.paymentStore.workspacePayments
            : this.paymentStore.userPayments;
    }

    get reachedMaxLimit(): boolean {
        return this.paymentScope === "workspace"
            ? this.paymentStore.reachedMaxWorkspaceLimit
            : this.paymentStore.reachedMaxUserLimit;
    }

    get canViewWorkspacePayments(): boolean {
        return (
            this.workspaceStore.hasPolicy(Policy.billing_read) ||
            this.workspaceStore.hasPolicy(Policy.workspace_admin)
        );
    }

    async ngOnInit(): Promise<void> {
        await this.paymentStore.loadUserPayments();
    }

    async selectScope(scope: "user" | "workspace"): Promise<void> {
        this.paymentScope = scope;
        if (scope === "user" && this.paymentStore.userPayments.length === 0) {
            await this.paymentStore.loadUserPayments();
        }
        if (scope === "workspace" && this.paymentStore.workspacePayments.length === 0) {
            await this.paymentStore.loadWorkspacePayments();
        }
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

        if (!this.reachedMaxLimit) {
            this.getMore();
        }
    }

    async getMore(): Promise<void> {
        this.scrolling = true;
        try {
            if (this.paymentScope === "workspace") {
                await this.paymentStore.getWorkspacePayments();
            } else {
                await this.paymentStore.getUserPayments();
            }
        } finally {
            this.scrolling = false;
        }
    }

    formatAmount(payment: Payment): string {
        const amount = (payment.amount_cents ?? 0) / 100;
        try {
            return new Intl.NumberFormat(this.localSettings.locale, {
                style: "currency",
                currency: (payment.currency || "usd").toUpperCase(),
            }).format(amount);
        } catch {
            return `${amount.toFixed(2)} ${(payment.currency || "").toUpperCase()}`;
        }
    }

    paymentMethodLabel(payment: Payment): string {
        if (!payment.payment_method) return "Payment";
        return payment.payment_method
            .split("_")
            .map(p => p.charAt(0).toUpperCase() + p.slice(1))
            .join(" ");
    }

    statusLabel(status: string): string {
        switch (status) {
            case "succeeded":
                return "Paid";
            case "processing":
                return "Processing";
            case "requires_action":
            case "requires_payment_method":
            case "requires_confirmation":
                return "Awaiting payment";
            case "canceled":
                return "Cancelled";
            default:
                return status;
        }
    }

    statusBadgeClass(status: string): string {
        switch (status) {
            case "succeeded":
                return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
            case "processing":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
            case "requires_action":
            case "requires_payment_method":
            case "requires_confirmation":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
            case "canceled":
                return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
        }
    }

    isBoleto(payment: Payment): boolean {
        return !!payment.boleto_url || payment.payment_method === "boleto";
    }

    openUrl(url: string): void {
        window.open(url, "_blank", "noopener");
    }
}
