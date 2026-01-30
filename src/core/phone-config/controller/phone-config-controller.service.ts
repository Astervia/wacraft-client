import { Injectable, inject } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { AuthService } from "../../auth/service/auth.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { PhoneConfig } from "../entity/phone-config.entity";
import { CreatePhoneConfig, UpdatePhoneConfig } from "../model/create.model";
import { Paginate } from "../../common/model/paginate.model";
import { DateOrder } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class PhoneConfigControllerService extends MainServerControllerService {
    override auth: AuthService;

    constructor() {
        const auth = inject(AuthService);

        super();
        this.auth = auth;

        this.setPath(ServerEndpoints.workspace);
        this.setHttp();
    }

    async get(
        workspaceId: string,
        pagination: Paginate = { limit: 10, offset: 0 },
        order: DateOrder = {},
    ): Promise<PhoneConfig[]> {
        return (
            await this.http.get<PhoneConfig[]>(`${workspaceId}/${ServerEndpoints.phone_config}`, {
                params: {
                    ...pagination,
                    ...order,
                },
            })
        ).data;
    }

    async create(workspaceId: string, data: CreatePhoneConfig): Promise<PhoneConfig> {
        return (
            await this.http.post<PhoneConfig>(
                `${workspaceId}/${ServerEndpoints.phone_config}`,
                data,
            )
        ).data;
    }

    async update(
        workspaceId: string,
        id: string,
        data: UpdatePhoneConfig,
    ): Promise<PhoneConfig> {
        return (
            await this.http.patch<PhoneConfig>(
                `${workspaceId}/${ServerEndpoints.phone_config}/${id}`,
                data,
            )
        ).data;
    }

    async delete(workspaceId: string, id: string): Promise<void> {
        return (
            await this.http.delete<void>(`${workspaceId}/${ServerEndpoints.phone_config}/${id}`)
        ).data;
    }
}
