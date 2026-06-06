import { Injectable } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { PaymentListResponse, PaymentQuery } from "../model/payment-list.model";

@Injectable({
    providedIn: "root",
})
export class BillingPaymentControllerService extends MainServerControllerService {
    constructor() {
        super();
        this.setPath(ServerEndpoints.billing);
        this.setHttp();
    }

    async list(query: PaymentQuery = {}, withWorkspace = true): Promise<PaymentListResponse> {
        const params = { ...query };
        if (withWorkspace) {
            return (
                await this.http.get<PaymentListResponse>(`${ServerEndpoints.billing_payment}`, {
                    params,
                })
            ).data;
        }
        return (
            await this.requestWithoutWorkspace<PaymentListResponse>(
                "get",
                `${ServerEndpoints.billing_payment}`,
                { params },
            )
        ).data;
    }
}
