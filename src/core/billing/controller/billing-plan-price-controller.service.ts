import { Injectable } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { PlanPrice } from "../entity/plan-price.entity";
import { CreatePlanPrice, UpdatePlanPrice } from "../model/create-plan-price.model";
import { Paginate } from "../../common/model/paginate.model";
import { DateOrder } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class BillingPlanPriceControllerService extends MainServerControllerService {
    constructor() {
        super();
        this.setPath(ServerEndpoints.billing);
        this.setHttp();
    }

    async get(
        planId: string,
        pagination: Paginate = { limit: 50, offset: 0 },
        order: DateOrder = {},
    ): Promise<PlanPrice[]> {
        return (
            await this.http.get<PlanPrice[]>(
                `${ServerEndpoints.billing_plan}/${planId}/${ServerEndpoints.billing_plan_price}`,
                { params: { ...pagination, ...order } },
            )
        ).data;
    }

    async create(planId: string, data: CreatePlanPrice): Promise<PlanPrice> {
        return (
            await this.http.post<PlanPrice>(
                `${ServerEndpoints.billing_plan}/${planId}/${ServerEndpoints.billing_plan_price}`,
                data,
            )
        ).data;
    }

    async update(planId: string, id: string, data: UpdatePlanPrice): Promise<PlanPrice> {
        return (
            await this.http.put<PlanPrice>(
                `${ServerEndpoints.billing_plan}/${planId}/${ServerEndpoints.billing_plan_price}`,
                data,
                { params: { id } },
            )
        ).data;
    }

    async delete(planId: string, id: string): Promise<void> {
        return (
            await this.http.delete<void>(
                `${ServerEndpoints.billing_plan}/${planId}/${ServerEndpoints.billing_plan_price}`,
                { params: { id } },
            )
        ).data;
    }
}
