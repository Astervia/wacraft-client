import { Injectable, inject } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { AuthService } from "../../auth/service/auth.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { User } from "../entity/user.entity";
import { EditUserWithId, EditUserWithPassword } from "../model/edit-user.model";
import { Query } from "../model/query.model";
import { Paginate } from "../../common/model/paginate.model";
import { DateOrder } from "../../common/model/date-order.model";
import { WhereDate } from "../../common/model/where-date.model";

@Injectable({
    providedIn: "root",
})
export class UserControllerService extends MainServerControllerService {
    override auth: AuthService;

    constructor() {
        const auth = inject(AuthService);

        super();
        this.auth = auth;

        this.setPath(ServerEndpoints.user);
        this.setHttp();
    }

    async get(
        query: Query = {},
        pagination: Paginate = { limit: 10, offset: 0 },
        order: DateOrder = {},
        whereDate: WhereDate = {},
    ): Promise<User[]> {
        return (
            await this.http.get(``, {
                params: {
                    ...query,
                    ...pagination,
                    ...order,
                    ...whereDate,
                },
            })
        ).data;
    }

    // Get current user
    async getCurrentUser(): Promise<{ user: User; billingEnabled: boolean }> {
        const response = await this.http.get<User>(`${ServerEndpoints.me}`);
        const billingEnabled = response.headers["x-ratelimit-limit"] !== undefined;
        return { user: response.data, billingEnabled };
    }

    async contentLike(
        likeText: string,
        likeKey: string,
        query: Query = {},
        pagination: Paginate = { limit: 10, offset: 0 },
        order: DateOrder = {},
        whereDate: WhereDate = {},
    ): Promise<User[]> {
        likeText = encodeURIComponent(likeText);
        likeKey = encodeURIComponent(likeKey);
        return (
            await this.http.get<User[]>(
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

    async create(data: EditUserWithPassword): Promise<User> {
        return (await this.http.post(``, data)).data;
    }

    // Update current user
    async updateCurrentUser(editUser: EditUserWithPassword): Promise<User> {
        return (await this.http.put(`${ServerEndpoints.me}`, editUser)).data;
    }

    async update(editUser: EditUserWithId): Promise<User> {
        return (await this.http.put(``, editUser)).data;
    }

    async delete(id: string): Promise<void> {
        return (await this.http.delete<void>("", { data: { id } })).data;
    }

    // Delete current user
    async deleteCurrentUser(): Promise<void> {
        await this.http.delete(`${ServerEndpoints.me}`);
    }
}
