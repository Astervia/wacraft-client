import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../app.routes";
import { BillingPlanStoreService } from "../../core/billing/store/billing-plan-store.service";
import { BillingSubscriptionStoreService } from "../../core/billing/store/billing-subscription-store.service";
import { BillingEndpointWeightStoreService } from "../../core/billing/store/billing-endpoint-weight-store.service";
import { BillingPlanControllerService } from "../../core/billing/controller/billing-plan-controller.service";
import { BillingPlanPriceControllerService } from "../../core/billing/controller/billing-plan-price-controller.service";
import { BillingSubscriptionControllerService } from "../../core/billing/controller/billing-subscription-controller.service";
import { Plan } from "../../core/billing/entity/plan.entity";
import { PlanPrice } from "../../core/billing/entity/plan-price.entity";
import { CreatePlan, UpdatePlan } from "../../core/billing/model/create-plan.model";
import { CreatePlanPrice, UpdatePlanPrice } from "../../core/billing/model/create-plan-price.model";
import { CreateManualSubscription } from "../../core/billing/model/create-manual-subscription.model";
import { CreateEndpointWeight } from "../../core/billing/model/create-endpoint-weight.model";

@Component({
    selector: "app-billing-admin",
    imports: [CommonModule, FormsModule, SidebarLayoutComponent],
    templateUrl: "./billing-admin.component.html",
    standalone: true,
})
export class BillingAdminComponent implements OnInit {
    planStore = inject(BillingPlanStoreService);
    subscriptionStore = inject(BillingSubscriptionStoreService);
    weightStore = inject(BillingEndpointWeightStoreService);
    private planController = inject(BillingPlanControllerService);
    private planPriceController = inject(BillingPlanPriceControllerService);
    private subscriptionController = inject(BillingSubscriptionControllerService);

    RoutePath = RoutePath;

    errorMessage = "";
    loading = false;
    private scrolling = false;

    // Plan management
    showPlanForm = false;
    editingPlan: Plan | null = null;
    planForm: CreatePlan = {
        name: "",
        slug: "",
        throughput_limit: 0,
        window_seconds: 60,
        duration_days: 30,
    };

    // Inline prices during plan creation
    planFormPrices: CreatePlanPrice[] = [];
    planFormPriceDraft: CreatePlanPrice = { currency: "", price_cents: 0, is_default: false };

    // Plan price management (accordion on existing plans)
    managingPricesPlan: Plan | null = null;
    priceForm: CreatePlanPrice = { currency: "", price_cents: 0, is_default: false };
    editingPrice: PlanPrice | null = null;
    editPriceForm: UpdatePlanPrice = {};

    // Manual subscription
    manualSubForm: CreateManualSubscription = {
        plan_id: "",
        scope: "user",
        user_id: "",
    };

    // Endpoint weight
    weightForm: CreateEndpointWeight = {
        method: "GET",
        path_pattern: "",
        weight: 1,
    };

    async ngOnInit() {
        await Promise.all([this.planStore.load(), this.weightStore.load()]);
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

        this.getMore();
    }

    async getMore(): Promise<void> {
        this.scrolling = true;
        try {
            const promises: Promise<void>[] = [];
            if (!this.planStore.reachedMaxLimit) promises.push(this.planStore.get());
            if (!this.weightStore.reachedMaxLimit) promises.push(this.weightStore.get());
            await Promise.all(promises);
        } finally {
            this.scrolling = false;
        }
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

    // Plan CRUD
    openCreatePlan(): void {
        this.editingPlan = null;
        this.planForm = {
            name: "",
            slug: "",
            throughput_limit: 0,
            window_seconds: 60,
            duration_days: 30,
        };
        this.planFormPrices = [];
        this.planFormPriceDraft = { currency: "", price_cents: 0, is_default: false };
        this.showPlanForm = true;
    }

    addPlanFormPrice(): void {
        if (!this.planFormPriceDraft.currency) return;
        // Enforce a single default across the draft list
        if (this.planFormPriceDraft.is_default) {
            this.planFormPrices.forEach(p => (p.is_default = false));
        }
        // Auto-set first price as default if none yet
        if (this.planFormPrices.length === 0) {
            this.planFormPriceDraft.is_default = true;
        }
        this.planFormPrices.push({ ...this.planFormPriceDraft });
        this.planFormPriceDraft = { currency: "", price_cents: 0, is_default: false };
    }

    removePlanFormPrice(index: number): void {
        const wasDefault = this.planFormPrices[index].is_default;
        this.planFormPrices.splice(index, 1);
        // Promote first remaining entry as default if the removed one was default
        if (wasDefault && this.planFormPrices.length > 0) {
            this.planFormPrices[0].is_default = true;
        }
    }

    setPlanFormPriceDefault(index: number): void {
        this.planFormPrices.forEach((p, i) => (p.is_default = i === index));
    }

    openEditPlan(plan: Plan): void {
        this.editingPlan = plan;
        this.planForm = {
            name: plan.name,
            slug: plan.slug,
            description: plan.description,
            throughput_limit: plan.throughput_limit,
            window_seconds: plan.window_seconds,
            duration_days: plan.duration_days,
            is_default: plan.is_default,
            is_custom: plan.is_custom,
            active: plan.active,
        };
        this.showPlanForm = true;
    }

    openManagePrices(plan: Plan): void {
        this.managingPricesPlan = plan;
        this.priceForm = { currency: "", price_cents: 0, is_default: false };
        this.editingPrice = null;
    }

    closeManagePrices(): void {
        this.managingPricesPlan = null;
        this.editingPrice = null;
    }

    openEditPrice(price: PlanPrice): void {
        this.editingPrice = price;
        this.editPriceForm = { price_cents: price.price_cents, is_default: price.is_default };
    }

    async addPrice(): Promise<void> {
        if (!this.managingPricesPlan) return;
        this.loading = true;
        this.errorMessage = "";
        try {
            await this.planPriceController.create(this.managingPricesPlan.id, this.priceForm);
            this.priceForm = { currency: "", price_cents: 0, is_default: false };
            await this.planStore.load();
            this.managingPricesPlan =
                this.planStore.plans.find(p => p.id === this.managingPricesPlan!.id) ?? null;
        } catch {
            this.errorMessage = "Failed to add price.";
        } finally {
            this.loading = false;
        }
    }

    async savePrice(): Promise<void> {
        if (!this.managingPricesPlan || !this.editingPrice) return;
        this.loading = true;
        this.errorMessage = "";
        try {
            await this.planPriceController.update(
                this.managingPricesPlan.id,
                this.editingPrice.id,
                this.editPriceForm,
            );
            this.editingPrice = null;
            await this.planStore.load();
            this.managingPricesPlan =
                this.planStore.plans.find(p => p.id === this.managingPricesPlan!.id) ?? null;
        } catch {
            this.errorMessage = "Failed to update price.";
        } finally {
            this.loading = false;
        }
    }

    async deletePrice(price: PlanPrice): Promise<void> {
        if (!this.managingPricesPlan) return;
        if (!confirm(`Delete ${price.currency.toUpperCase()} price?`)) return;
        this.loading = true;
        try {
            await this.planPriceController.delete(this.managingPricesPlan.id, price.id);
            await this.planStore.load();
            this.managingPricesPlan =
                this.planStore.plans.find(p => p.id === this.managingPricesPlan!.id) ?? null;
        } catch {
            this.errorMessage = "Failed to delete price.";
        } finally {
            this.loading = false;
        }
    }

    async savePlan(): Promise<void> {
        this.loading = true;
        this.errorMessage = "";
        try {
            if (this.editingPlan) {
                await this.planController.update(this.editingPlan.id, this.planForm as UpdatePlan);
            } else {
                await this.planController.create({
                    ...this.planForm,
                    prices: this.planFormPrices.length > 0 ? this.planFormPrices : undefined,
                });
            }
            this.showPlanForm = false;
            await this.planStore.load();
        } catch {
            this.errorMessage = "Failed to save plan.";
        } finally {
            this.loading = false;
        }
    }

    async deletePlan(id: string): Promise<void> {
        if (!confirm("Are you sure you want to delete this plan?")) return;
        this.loading = true;
        try {
            await this.planController.delete(id);
            await this.planStore.load();
        } catch {
            this.errorMessage = "Failed to delete plan.";
        } finally {
            this.loading = false;
        }
    }

    // Manual subscription
    async createManualSubscription(): Promise<void> {
        this.loading = true;
        this.errorMessage = "";
        try {
            await this.subscriptionController.createManual(this.manualSubForm);
            this.manualSubForm = { plan_id: "", scope: "user", user_id: "" };
            await this.subscriptionStore.loadUserSubscriptions();
        } catch {
            this.errorMessage = "Failed to create manual subscription.";
        } finally {
            this.loading = false;
        }
    }

    // Endpoint weights
    async createWeight(): Promise<void> {
        this.loading = true;
        this.errorMessage = "";
        try {
            await this.weightStore.create(this.weightForm);
            this.weightForm = { method: "GET", path_pattern: "", weight: 1 };
        } catch {
            this.errorMessage = "Failed to create endpoint weight.";
        } finally {
            this.loading = false;
        }
    }

    async deleteWeight(id: string): Promise<void> {
        if (!confirm("Delete this endpoint weight?")) return;
        await this.weightStore.delete(id);
    }
}
