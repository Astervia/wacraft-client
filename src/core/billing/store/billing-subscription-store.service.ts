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
    userSubscriptions: Subscription[] = [];
    workspaceSubscriptions: Subscription[] = [];
    loading = false;

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.subscriptions = [];
            this.userSubscriptions = [];
            this.workspaceSubscriptions = [];
        });
    }

    async load(): Promise<void> {
        this.loading = true;
        this.subscriptions = [];
        this.userSubscriptions = [];
        this.workspaceSubscriptions = [];
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

    async loadUserSubscriptions(): Promise<void> {
        try {
            this.userSubscriptions = await this.subscriptionController.get(
                { limit: 50, offset: 0 },
                { created_at: DateOrderEnum.desc },
                false,
            );
        } catch (error) {
            this.logger.error("Error loading user subscriptions", error);
        }
    }

    async loadWorkspaceSubscriptions(): Promise<void> {
        try {
            this.workspaceSubscriptions = await this.subscriptionController.get(
                { limit: 50, offset: 0 },
                { created_at: DateOrderEnum.desc },
                true,
            );
        } catch (error) {
            this.logger.error("Error loading workspace subscriptions", error);
        }
    }

    async checkout(
        planId: string,
        scope: "user" | "workspace",
        workspaceId?: string,
        paymentMode?: PaymentMode,
        currency?: string,
        successUrl?: string,
        cancelUrl?: string,
    ): Promise<string | null> {
        try {
            const response = await this.subscriptionController.checkout(
                {
                    plan_id: planId,
                    currency,
                    scope,
                    workspace_id: workspaceId,
                    payment_mode: paymentMode,
                    success_url: successUrl || `${window.location.origin}/billing-success`,
                    cancel_url: cancelUrl || `${window.location.origin}/billing-cancel`,
                },
                scope === "workspace",
            );
            return response.checkout_url;
        } catch (error) {
            this.logger.error("Error during checkout", error);
            return null;
        }
    }

    async cancel(id: string, withWorkspace = false): Promise<void> {
        try {
            await this.subscriptionController.cancel(id, withWorkspace);
            if (withWorkspace) {
                await this.loadWorkspaceSubscriptions();
            } else {
                await this.loadUserSubscriptions();
            }
        } catch (error) {
            this.logger.error("Error cancelling subscription", error);
        }
    }

    async reactivate(id: string, withWorkspace = false): Promise<void> {
        try {
            await this.subscriptionController.reactivate(id, withWorkspace);
            if (withWorkspace) {
                await this.loadWorkspaceSubscriptions();
            } else {
                await this.loadUserSubscriptions();
            }
        } catch (error) {
            this.logger.error("Error reactivating subscription", error);
        }
    }

    async sync(id: string, withWorkspace = false): Promise<void> {
        try {
            const updated = await this.subscriptionController.sync(id, withWorkspace);
            const list = withWorkspace ? this.workspaceSubscriptions : this.userSubscriptions;
            const index = list.findIndex(s => s.id === id);
            if (index !== -1) {
                list[index] = updated;
            }
        } catch (error) {
            this.logger.error("Error syncing subscription", error);
            throw error;
        }
    }
}
