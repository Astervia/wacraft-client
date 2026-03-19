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

    private paginationLimit = 15;

    public reachedMaxLimit = false;
    loading = false;

    plans: Plan[] = [];

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.plans = [];
            this.reachedMaxLimit = false;
        });
    }

    async get(): Promise<void> {
        const plans = await this.planController.get(
            {
                limit: this.paginationLimit,
                offset: this.plans.length,
            },
            { created_at: DateOrderEnum.desc },
        );

        if (!plans.length) {
            this.reachedMaxLimit = true;
            return;
        }

        this.add(plans);
    }

    add(plans: Plan[]) {
        this.plans = [...this.plans, ...plans];
    }

    async load(): Promise<void> {
        this.loading = true;
        this.plans = [];
        this.reachedMaxLimit = false;
        try {
            await this.get();
        } catch (error) {
            this.logger.error("Error loading billing plans", error);
        } finally {
            this.loading = false;
        }
    }
}
