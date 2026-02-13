import { Injectable, inject } from "@angular/core";
import { NGXLogger } from "ngx-logger";
import { UsageInfo } from "../entity/usage.entity";
import { BillingUsageControllerService } from "../controller/billing-usage-controller.service";

@Injectable({
    providedIn: "root",
})
export class BillingUsageStoreService {
    private usageController = inject(BillingUsageControllerService);
    private logger = inject(NGXLogger);

    usageItems: UsageInfo[] = [];
    loading = false;

    async load(): Promise<void> {
        this.loading = true;
        this.usageItems = [];
        try {
            this.usageItems = await this.usageController.get();
        } catch (error) {
            this.logger.error("Error loading usage info", error);
        } finally {
            this.loading = false;
        }
    }
}
