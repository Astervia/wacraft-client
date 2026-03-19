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

    private paginationLimit = 15;

    userSubscriptions: Subscription[] = [];
    workspaceSubscriptions: Subscription[] = [];

    public reachedMaxUserLimit = false;
    public reachedMaxWorkspaceLimit = false;
    loading = false;

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.userSubscriptions = [];
            this.workspaceSubscriptions = [];
            this.reachedMaxUserLimit = false;
            this.reachedMaxWorkspaceLimit = false;
        });
    }

    async getUserSubscriptions(): Promise<void> {
        const subscriptions = await this.subscriptionController.get(
            {
                limit: this.paginationLimit,
                offset: this.userSubscriptions.length,
            },
            { created_at: DateOrderEnum.desc },
            false,
        );

        if (!subscriptions.length) {
            this.reachedMaxUserLimit = true;
            return;
        }

        this.addUser(subscriptions);
    }

    addUser(subscriptions: Subscription[]) {
        this.userSubscriptions = [...this.userSubscriptions, ...subscriptions];
    }

    async loadUserSubscriptions(): Promise<void> {
        this.loading = true;
        this.userSubscriptions = [];
        this.reachedMaxUserLimit = false;
        try {
            await this.getUserSubscriptions();
        } catch (error) {
            this.logger.error("Error loading user subscriptions", error);
        } finally {
            this.loading = false;
        }
    }

    async getWorkspaceSubscriptions(): Promise<void> {
        const subscriptions = await this.subscriptionController.get(
            {
                limit: this.paginationLimit,
                offset: this.workspaceSubscriptions.length,
            },
            { created_at: DateOrderEnum.desc },
            true,
        );

        if (!subscriptions.length) {
            this.reachedMaxWorkspaceLimit = true;
            return;
        }

        this.addWorkspace(subscriptions);
    }

    addWorkspace(subscriptions: Subscription[]) {
        this.workspaceSubscriptions = [...this.workspaceSubscriptions, ...subscriptions];
    }

    async loadWorkspaceSubscriptions(): Promise<void> {
        this.loading = true;
        this.workspaceSubscriptions = [];
        this.reachedMaxWorkspaceLimit = false;
        try {
            await this.getWorkspaceSubscriptions();
        } catch (error) {
            this.logger.error("Error loading workspace subscriptions", error);
        } finally {
            this.loading = false;
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
