import { Injectable, inject } from "@angular/core";
import { NGXLogger } from "ngx-logger";
import { PaymentMode, Subscription } from "../entity/subscription.entity";
import { BillingSubscriptionControllerService } from "../controller/billing-subscription-controller.service";
import { WorkspaceStoreService } from "../../workspace/store/workspace-store.service";
import { DateOrderEnum } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class BillingSubscriptionStoreService {
    private subscriptionController = inject(BillingSubscriptionControllerService);
    private workspaceStore = inject(WorkspaceStoreService);
    private logger = inject(NGXLogger);

    subscriptions: Subscription[] = [];
    loading = false;

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.subscriptions = [];
        });
    }

    async load(): Promise<void> {
        this.loading = true;
        this.subscriptions = [];
        try {
            this.subscriptions = await this.subscriptionController.get(
                { limit: 50, offset: 0 },
                { created_at: DateOrderEnum.desc },
            );
        } catch (error) {
            this.logger.error("Error loading subscriptions", error);
        } finally {
            this.loading = false;
        }
    }

    async checkout(
        planId: string,
        scope: "user" | "workspace",
        workspaceId?: string,
        paymentMode?: PaymentMode,
        successUrl?: string,
        cancelUrl?: string,
    ): Promise<string | null> {
        try {
            const response = await this.subscriptionController.checkout({
                plan_id: planId,
                scope,
                workspace_id: workspaceId,
                payment_mode: paymentMode,
                success_url: successUrl || `${window.location.origin}/billing-success`,
                cancel_url: cancelUrl || `${window.location.origin}/billing-cancel`,
            });
            return response.checkout_url;
        } catch (error) {
            this.logger.error("Error during checkout", error);
            return null;
        }
    }

    async cancel(id: string): Promise<void> {
        try {
            await this.subscriptionController.cancel(id);
            await this.load();
        } catch (error) {
            this.logger.error("Error cancelling subscription", error);
        }
    }

    async reactivate(id: string): Promise<void> {
        try {
            await this.subscriptionController.reactivate(id);
            await this.load();
        } catch (error) {
            this.logger.error("Error reactivating subscription", error);
        }
    }

    async sync(id: string): Promise<void> {
        try {
            const updated = await this.subscriptionController.sync(id);
            const index = this.subscriptions.findIndex((s) => s.id === id);
            if (index !== -1) {
                this.subscriptions[index] = updated;
            }
        } catch (error) {
            this.logger.error("Error syncing subscription", error);
            throw error;
        }
    }
}
