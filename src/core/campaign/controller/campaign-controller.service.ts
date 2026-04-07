import { Injectable, inject } from "@angular/core";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { AuthService } from "../../auth/service/auth.service";
import { Paginate } from "../../common/model/paginate.model";
import { DateOrder } from "../../common/model/date-order.model";
import { WhereDate } from "../../common/model/where-date.model";
import { CampaignFields } from "../entity/campaign.entity";
import { Query } from "../model/query.model";
import { Create } from "../model/create.model";
import { Update } from "../model/update.model";

@Injectable({
    providedIn: "root",
})
export class CampaignControllerService extends MainServerControllerService {
    override auth: AuthService;

    constructor() {
        const auth = inject(AuthService);

        super();
        this.auth = auth;

        this.setPath(ServerEndpoints.campaign);
        this.setHttp();
    }

    async get(
        query: Query = {},
        pagination: Paginate = { limit: 10, offset: 0 },
        order: DateOrder = {},
        whereDate: WhereDate = {},
    ): Promise<CampaignFields[]> {
        return (
            await this.http.get<CampaignFields[]>("", {
                params: {
                    ...query,
                    ...pagination,
                    ...order,
                    ...whereDate,
                },
            })
        ).data;
    }

    async contentLike(
        likeText: string,
        likeKey: string,
        query: Query = {},
        pagination: Paginate = { limit: 10, offset: 0 },
        order: DateOrder = {},
        whereDate: WhereDate = {},
    ): Promise<CampaignFields[]> {
        likeText = encodeURIComponent(likeText);
        likeKey = encodeURIComponent(likeKey);
        return (
            await this.http.get<CampaignFields[]>(
                `${ServerEndpoints.content}/${likeKey}/${ServerEndpoints.like}/${likeText}`,
                {
                    params: {
                        ...query,
                        ...pagination,
                        ...order,
                        ...whereDate,
                    },
                },
            )
        ).data;
    }

    async create(data: Create): Promise<CampaignFields> {
        return (await this.http.post<CampaignFields>("", data)).data;
    }

    async update(data: Update): Promise<CampaignFields> {
        return (await this.http.patch<CampaignFields>("", data)).data;
    }

    async delete(id: string): Promise<void> {
        return (await this.http.delete<void>("", { data: { id } })).data;
    }

    async schedule(id: string, scheduled_at: string): Promise<CampaignFields> {
        return (
            await this.http.post<CampaignFields>(ServerEndpoints.schedule, { id, scheduled_at })
        ).data;
    }

    async unschedule(id: string): Promise<CampaignFields> {
        return (await this.http.delete<CampaignFields>(ServerEndpoints.schedule, { data: { id } }))
            .data;
    }
}
