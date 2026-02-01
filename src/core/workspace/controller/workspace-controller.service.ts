import { Injectable, inject } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { AuthService } from "../../auth/service/auth.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { Workspace } from "../entity/workspace.entity";
import { Paginate } from "../../common/model/paginate.model";
import { DateOrder } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class WorkspaceControllerService extends MainServerControllerService {
    override auth: AuthService;

    constructor() {
        const auth = inject(AuthService);

        super();
        this.auth = auth;

        this.setPath(ServerEndpoints.workspace);
        this.setHttp();
    }

    async get(
        pagination: Paginate = { limit: 15, offset: 0 },
        order: DateOrder = {},
    ): Promise<Workspace[]> {
        return (
            await this.http.get<Workspace[]>("", {
                params: { ...pagination, ...order },
            })
        ).data;
    }

    async create(data: { name: string; slug: string; description?: string }): Promise<Workspace> {
        return (await this.http.post<Workspace>("", data)).data;
    }

    async update(
        id: string,
        data: { name?: string; slug?: string; description?: string },
    ): Promise<Workspace> {
        return (await this.http.patch<Workspace>(`${id}`, data)).data;
    }

    async delete(id: string): Promise<void> {
        return (await this.http.delete<void>(`${id}`)).data;
    }
}
