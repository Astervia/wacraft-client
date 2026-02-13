import { Injectable } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { Plan } from "../entity/plan.entity";
import { CreatePlan, UpdatePlan } from "../model/create-plan.model";
import { Paginate } from "../../common/model/paginate.model";
import { DateOrder } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class BillingPlanControllerService extends MainServerControllerService {
    constructor() {
        super();
        this.setPath(ServerEndpoints.billing);
        this.setHttp();
    }

    async get(
        pagination: Paginate = { limit: 50, offset: 0 },
        order: DateOrder = {},
    ): Promise<Plan[]> {
        return (
            await this.http.get<Plan[]>(`${ServerEndpoints.billing_plan}`, {
                params: {
                    ...pagination,
                    ...order,
                },
            })
        ).data;
    }

    async create(data: CreatePlan): Promise<Plan> {
        return (await this.http.post<Plan>(`${ServerEndpoints.billing_plan}`, data)).data;
    }

    async update(id: string, data: UpdatePlan): Promise<Plan> {
        return (
            await this.http.put<Plan>(`${ServerEndpoints.billing_plan}`, data, {
                params: { id },
            })
        ).data;
    }

    async delete(id: string): Promise<void> {
        return (
            await this.http.delete<void>(`${ServerEndpoints.billing_plan}`, {
                params: { id },
            })
        ).data;
    }
}
