import { Injectable } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { Subscription } from "../entity/subscription.entity";
import { CheckoutRequest, CheckoutResponse } from "../model/checkout.model";
import { CreateManualSubscription } from "../model/create-manual-subscription.model";
import { Paginate } from "../../common/model/paginate.model";
import { DateOrder } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class BillingSubscriptionControllerService extends MainServerControllerService {
    constructor() {
        super();
        this.setPath(ServerEndpoints.billing);
        this.setHttp();
    }

    async get(
        pagination: Paginate = { limit: 50, offset: 0 },
        order: DateOrder = {},
    ): Promise<Subscription[]> {
        return (
            await this.http.get<Subscription[]>(`${ServerEndpoints.billing_subscription}`, {
                params: {
                    ...pagination,
                    ...order,
                },
            })
        ).data;
    }

    async checkout(data: CheckoutRequest): Promise<CheckoutResponse> {
        return (
            await this.http.post<CheckoutResponse>(
                `${ServerEndpoints.billing_subscription}/${ServerEndpoints.billing_checkout}`,
                data,
            )
        ).data;
    }

    async createManual(data: CreateManualSubscription): Promise<Subscription> {
        return (
            await this.http.post<Subscription>(
                `${ServerEndpoints.billing_subscription}/${ServerEndpoints.billing_manual}`,
                data,
            )
        ).data;
    }

    async cancel(id: string): Promise<void> {
        console.info("cancelling");
        return (
            await this.http.delete<void>(`${ServerEndpoints.billing_subscription}`, {
                params: { id },
            })
        ).data;
    }

    async reactivate(id: string): Promise<void> {
        return (
            await this.http.post<void>(
                `${ServerEndpoints.billing_subscription}/${ServerEndpoints.billing_reactivate}`,
                null,
                { params: { id } },
            )
        ).data;
    }
}
