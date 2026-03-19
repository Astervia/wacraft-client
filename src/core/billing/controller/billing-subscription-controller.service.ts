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
        withWorkspace = true,
    ): Promise<Subscription[]> {
        const params = { ...pagination, ...order };
        if (withWorkspace) {
            return (
                await this.http.get<Subscription[]>(`${ServerEndpoints.billing_subscription}`, {
                    params,
                })
            ).data;
        }
        return (
            await this.requestWithoutWorkspace<Subscription[]>(
                "get",
                `${ServerEndpoints.billing_subscription}`,
                { params },
            )
        ).data;
    }

    async checkout(data: CheckoutRequest, withWorkspace = true): Promise<CheckoutResponse> {
        const url = `${ServerEndpoints.billing_subscription}/${ServerEndpoints.billing_checkout}`;
        if (withWorkspace) {
            return (await this.http.post<CheckoutResponse>(url, data)).data;
        }
        return (await this.requestWithoutWorkspace<CheckoutResponse>("post", url, { data })).data;
    }

    async createManual(data: CreateManualSubscription): Promise<Subscription> {
        return (
            await this.http.post<Subscription>(
                `${ServerEndpoints.billing_subscription}/${ServerEndpoints.billing_manual}`,
                data,
            )
        ).data;
    }

    async cancel(id: string, withWorkspace = true): Promise<void> {
        console.info("cancelling");
        const params = { id };
        if (withWorkspace) {
            return (
                await this.http.delete<void>(`${ServerEndpoints.billing_subscription}`, { params })
            ).data;
        }
        return (
            await this.requestWithoutWorkspace<void>(
                "delete",
                `${ServerEndpoints.billing_subscription}`,
                { params },
            )
        ).data;
    }

    async reactivate(id: string, withWorkspace = true): Promise<void> {
        const url = `${ServerEndpoints.billing_subscription}/${ServerEndpoints.billing_reactivate}`;
        const params = { id };
        if (withWorkspace) {
            return (await this.http.post<void>(url, null, { params })).data;
        }
        return (await this.requestWithoutWorkspace<void>("post", url, { params })).data;
    }

    async sync(id: string, withWorkspace = true): Promise<Subscription> {
        const url = `${ServerEndpoints.billing_subscription}/${ServerEndpoints.billing_sync}`;
        const params = { id };
        if (withWorkspace) {
            return (await this.http.post<Subscription>(url, null, { params })).data;
        }
        return (await this.requestWithoutWorkspace<Subscription>("post", url, { params })).data;
    }
}
