import { Injectable, inject } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { AuthService } from "../../auth/service/auth.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { WorkspaceMember } from "../entity/workspace-member.entity";
import { Policy } from "../model/policy.model";
import { Paginate } from "../../common/model/paginate.model";
import { DateOrder } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class WorkspaceMemberControllerService extends MainServerControllerService {
    override auth: AuthService;

    constructor() {
        const auth = inject(AuthService);

        super();
        this.auth = auth;

        this.setPath(ServerEndpoints.workspace);
        this.setHttp();
    }

    async getMembers(
        workspaceId: string,
        pagination: Paginate = { limit: 10, offset: 0 },
        order: DateOrder = {},
    ): Promise<WorkspaceMember[]> {
        return (
            await this.http.get<WorkspaceMember[]>(`${workspaceId}/${ServerEndpoints.member}`, {
                params: {
                    ...pagination,
                    ...order,
                },
            })
        ).data;
    }

    async addMember(
        workspaceId: string,
        data: { user_id: string; policies: Policy[] },
    ): Promise<WorkspaceMember> {
        return (
            await this.http.post<WorkspaceMember>(`${workspaceId}/${ServerEndpoints.member}`, data)
        ).data;
    }

    async updateMemberPolicies(
        workspaceId: string,
        memberId: string,
        policies: Policy[],
    ): Promise<WorkspaceMember> {
        return (
            await this.http.patch<WorkspaceMember>(
                `${workspaceId}/${ServerEndpoints.member}/${memberId}`,
                { policies },
            )
        ).data;
    }

    async removeMember(workspaceId: string, memberId: string): Promise<void> {
        return (
            await this.http.delete<void>(`${workspaceId}/${ServerEndpoints.member}/${memberId}`)
        ).data;
    }

    async inviteMember(
        workspaceId: string,
        data: { email: string; policies: Policy[] },
    ): Promise<void> {
        return (await this.http.post<void>(`${workspaceId}/${ServerEndpoints.invitation}`, data))
            .data;
    }

    async getInvitations(workspaceId: string): Promise<unknown[]> {
        return (await this.http.get<unknown[]>(`${workspaceId}/${ServerEndpoints.invitation}`))
            .data;
    }

    async revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
        return (
            await this.http.delete<void>(
                `${workspaceId}/${ServerEndpoints.invitation}/${invitationId}`,
            )
        ).data;
    }
}
