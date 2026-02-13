import { Injectable, inject } from "@angular/core";
import { NGXLogger } from "ngx-logger";
import { EndpointWeight } from "../entity/endpoint-weight.entity";
import { BillingEndpointWeightControllerService } from "../controller/billing-endpoint-weight-controller.service";
import { CreateEndpointWeight } from "../model/create-endpoint-weight.model";
import { DateOrderEnum } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class BillingEndpointWeightStoreService {
    private weightController = inject(BillingEndpointWeightControllerService);
    private logger = inject(NGXLogger);

    weights: EndpointWeight[] = [];
    loading = false;

    async load(): Promise<void> {
        this.loading = true;
        this.weights = [];
        try {
            this.weights = await this.weightController.get(
                { limit: 50, offset: 0 },
                { created_at: DateOrderEnum.desc },
            );
        } catch (error) {
            this.logger.error("Error loading endpoint weights", error);
        } finally {
            this.loading = false;
        }
    }

    async create(data: CreateEndpointWeight): Promise<void> {
        try {
            await this.weightController.create(data);
            await this.load();
        } catch (error) {
            this.logger.error("Error creating endpoint weight", error);
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await this.weightController.delete(id);
            await this.load();
        } catch (error) {
            this.logger.error("Error deleting endpoint weight", error);
        }
    }
}
