import { Injectable } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { UsageInfo } from "../entity/usage.entity";

@Injectable({
    providedIn: "root",
})
export class BillingUsageControllerService extends MainServerControllerService {
    constructor() {
        super();
        this.setPath(ServerEndpoints.billing);
        this.setHttp();
    }

    async get(): Promise<UsageInfo[]> {
        return (await this.http.get<UsageInfo[]>(`${ServerEndpoints.billing_usage}`)).data;
    }
}
