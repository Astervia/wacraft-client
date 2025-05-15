import { Injectable } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { AuthService } from "../../auth/service/auth.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { TemplateQueryParams } from "../model/template-query-params.model";
import { GetTemplateResponse } from "../model/get-response.model";

@Injectable({
    providedIn: "root",
})
export class TemplateControllerService extends MainServerControllerService {
    constructor(public override auth: AuthService) {
        super(auth);
        this.setPath(ServerEndpoints.whatsapp_template);
        this.setHttp();
    }

    async get(query: TemplateQueryParams = {}): Promise<GetTemplateResponse> {
        return (
            await this.http.get(``, {
                params: query,
            })
        ).data;
    }
}
