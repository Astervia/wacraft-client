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

    async update(workspaceId: string, id: string, data: UpdatePhoneConfig): Promise<PhoneConfig> {
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

    async getById(workspaceId: string, id: string): Promise<PhoneConfig> {
        return (
            await this.http.get<PhoneConfig>(`${workspaceId}/${ServerEndpoints.phone_config}/${id}`)
        ).data;
    }

    async requestCode(
        workspaceId: string,
        id: string,
        data: { code_method: string; language: string },
    ): Promise<void> {
        return (
            await this.http.post<void>(
                `${workspaceId}/${ServerEndpoints.phone_config}/${id}/${ServerEndpoints.request_code}`,
                data,
            )
        ).data;
    }

    async verifyCode(workspaceId: string, id: string, data: { code: string }): Promise<void> {
        return (
            await this.http.post<void>(
                `${workspaceId}/${ServerEndpoints.phone_config}/${id}/${ServerEndpoints.verify_code}`,
                data,
            )
        ).data;
    }

    async pinAuthenticate(workspaceId: string, id: string, data: { pin: string }): Promise<void> {
        return (
            await this.http.post<void>(
                `${workspaceId}/${ServerEndpoints.phone_config}/${id}/${ServerEndpoints.pin_authenticate}`,
                data,
            )
        ).data;
    }

    async register(
        workspaceId: string,
        id: string,
        data: { pin: string; data_localization_region?: string },
    ): Promise<void> {
        return (
            await this.http.post<void>(
                `${workspaceId}/${ServerEndpoints.phone_config}/${id}/${ServerEndpoints.register}`,
                data,
            )
        ).data;
    }

    async deregister(workspaceId: string, id: string): Promise<void> {
        return (
            await this.http.post<void>(
                `${workspaceId}/${ServerEndpoints.phone_config}/${id}/${ServerEndpoints.deregister}`,
            )
        ).data;
    }
}
