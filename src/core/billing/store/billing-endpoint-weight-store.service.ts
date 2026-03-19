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

    private paginationLimit = 15;

    public reachedMaxLimit = false;
    loading = false;

    weights: EndpointWeight[] = [];

    async get(): Promise<void> {
        const weights = await this.weightController.get(
            {
                limit: this.paginationLimit,
                offset: this.weights.length,
            },
            { created_at: DateOrderEnum.desc },
        );

        if (!weights.length) {
            this.reachedMaxLimit = true;
            return;
        }

        this.add(weights);
    }

    add(weights: EndpointWeight[]) {
        this.weights = [...this.weights, ...weights];
    }

    async load(): Promise<void> {
        this.loading = true;
        this.weights = [];
        this.reachedMaxLimit = false;
        try {
            await this.get();
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
