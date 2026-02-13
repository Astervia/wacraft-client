import { Injectable, inject } from "@angular/core";
import { NGXLogger } from "ngx-logger";
import { Plan } from "../entity/plan.entity";
import { BillingPlanControllerService } from "../controller/billing-plan-controller.service";
import { WorkspaceStoreService } from "../../workspace/store/workspace-store.service";
import { DateOrderEnum } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class BillingPlanStoreService {
    private planController = inject(BillingPlanControllerService);
    private workspaceStore = inject(WorkspaceStoreService);
    private logger = inject(NGXLogger);

    plans: Plan[] = [];
    loading = false;

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.plans = [];
        });
    }

    async load(): Promise<void> {
        this.loading = true;
        this.plans = [];
        try {
            this.plans = await this.planController.get(
                { limit: 50, offset: 0 },
                { created_at: DateOrderEnum.desc },
            );
        } catch (error) {
            this.logger.error("Error loading billing plans", error);
        } finally {
            this.loading = false;
        }
    }
}
