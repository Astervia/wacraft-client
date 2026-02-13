import { Injectable } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { EndpointWeight } from "../entity/endpoint-weight.entity";
import { CreateEndpointWeight } from "../model/create-endpoint-weight.model";
import { Paginate } from "../../common/model/paginate.model";
import { DateOrder } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class BillingEndpointWeightControllerService extends MainServerControllerService {
    constructor() {
        super();
        this.setPath(ServerEndpoints.billing);
        this.setHttp();
    }

    async get(
        pagination: Paginate = { limit: 50, offset: 0 },
        order: DateOrder = {},
    ): Promise<EndpointWeight[]> {
        return (
            await this.http.get<EndpointWeight[]>(`${ServerEndpoints.billing_endpoint_weight}`, {
                params: {
                    ...pagination,
                    ...order,
                },
            })
        ).data;
    }

    async create(data: CreateEndpointWeight): Promise<EndpointWeight> {
        return (
            await this.http.post<EndpointWeight>(`${ServerEndpoints.billing_endpoint_weight}`, data)
        ).data;
    }

    async delete(id: string): Promise<void> {
        return (
            await this.http.delete<void>(`${ServerEndpoints.billing_endpoint_weight}`, {
                params: { id },
            })
        ).data;
    }
}
