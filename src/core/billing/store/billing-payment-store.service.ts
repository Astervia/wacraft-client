import { Injectable, inject } from "@angular/core";
import { NGXLogger } from "ngx-logger";
import { Payment } from "../entity/payment.entity";
import { BillingPaymentControllerService } from "../controller/billing-payment-controller.service";
import { WorkspaceStoreService } from "../../workspace/store/workspace-store.service";

@Injectable({
    providedIn: "root",
})
export class BillingPaymentStoreService {
    private paymentController = inject(BillingPaymentControllerService);
    private workspaceStore = inject(WorkspaceStoreService);
    private logger = inject(NGXLogger);

    private paginationLimit = 15;

    userPayments: Payment[] = [];
    workspacePayments: Payment[] = [];

    private userCursor?: string;
    private workspaceCursor?: string;

    public reachedMaxUserLimit = false;
    public reachedMaxWorkspaceLimit = false;
    loading = false;

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.resetUser();
            this.resetWorkspace();
        });
    }

    private resetUser(): void {
        this.userPayments = [];
        this.userCursor = undefined;
        this.reachedMaxUserLimit = false;
    }

    private resetWorkspace(): void {
        this.workspacePayments = [];
        this.workspaceCursor = undefined;
        this.reachedMaxWorkspaceLimit = false;
    }

    async getUserPayments(): Promise<void> {
        const res = await this.paymentController.list(
            { limit: this.paginationLimit, cursor: this.userCursor },
            false,
        );
        this.userPayments = [...this.userPayments, ...res.data];
        this.userCursor = res.next_cursor;
        if (!res.has_more || !res.next_cursor) {
            this.reachedMaxUserLimit = true;
        }
    }

    async loadUserPayments(): Promise<void> {
        this.loading = true;
        this.resetUser();
        try {
            await this.getUserPayments();
        } catch (error) {
            this.logger.error("Error loading user payments", error);
        } finally {
            this.loading = false;
        }
    }

    async getWorkspacePayments(): Promise<void> {
        const res = await this.paymentController.list(
            { limit: this.paginationLimit, cursor: this.workspaceCursor },
            true,
        );
        this.workspacePayments = [...this.workspacePayments, ...res.data];
        this.workspaceCursor = res.next_cursor;
        if (!res.has_more || !res.next_cursor) {
            this.reachedMaxWorkspaceLimit = true;
        }
    }

    async loadWorkspacePayments(): Promise<void> {
        this.loading = true;
        this.resetWorkspace();
        try {
            await this.getWorkspacePayments();
        } catch (error) {
            this.logger.error("Error loading workspace payments", error);
        } finally {
            this.loading = false;
        }
    }
}
