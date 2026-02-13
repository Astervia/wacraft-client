import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../app.routes";
import { BillingPlanStoreService } from "../../core/billing/store/billing-plan-store.service";
import { BillingSubscriptionStoreService } from "../../core/billing/store/billing-subscription-store.service";
import { BillingEndpointWeightStoreService } from "../../core/billing/store/billing-endpoint-weight-store.service";
import { BillingPlanControllerService } from "../../core/billing/controller/billing-plan-controller.service";
import { BillingSubscriptionControllerService } from "../../core/billing/controller/billing-subscription-controller.service";
import { Plan } from "../../core/billing/entity/plan.entity";
import { CreatePlan, UpdatePlan } from "../../core/billing/model/create-plan.model";
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
    private subscriptionController = inject(BillingSubscriptionControllerService);

    RoutePath = RoutePath;

    errorMessage = "";
    loading = false;

    // Plan management
    showPlanForm = false;
    editingPlan: Plan | null = null;
    planForm: CreatePlan = {
        name: "",
        slug: "",
        throughput_limit: 0,
        window_seconds: 60,
        duration_days: 30,
        price_cents: 0,
        currency: "USD",
    };

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
            price_cents: 0,
            currency: "USD",
        };
        this.showPlanForm = true;
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
            price_cents: plan.price_cents,
            currency: plan.currency,
            is_default: plan.is_default,
            is_custom: plan.is_custom,
            active: plan.active,
        };
        this.showPlanForm = true;
    }

    async savePlan(): Promise<void> {
        this.loading = true;
        this.errorMessage = "";
        try {
            if (this.editingPlan) {
                await this.planController.update(this.editingPlan.id, this.planForm as UpdatePlan);
            } else {
                await this.planController.create(this.planForm);
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
            await this.subscriptionStore.load();
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
