import { Injectable, inject } from "@angular/core";
import { NGXLogger } from "ngx-logger";
import { WorkspaceMember } from "../entity/workspace-member.entity";
import { WorkspaceMemberControllerService } from "../controller/workspace-member-controller.service";
import { WorkspaceStoreService } from "./workspace-store.service";
import { DateOrderEnum } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class WorkspaceMemberStoreService {
    private memberController = inject(WorkspaceMemberControllerService);
    private workspaceStore = inject(WorkspaceStoreService);
    private logger = inject(NGXLogger);

    private paginationLimit = 15;

    public reachedMaxLimit = false;
    loading = false;

    members: WorkspaceMember[] = [];
    membersById = new Map<string, WorkspaceMember>();

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.members = [];
            this.membersById.clear();
            this.reachedMaxLimit = false;
        });
    }

    async get(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;

        const members = await this.memberController.getMembers(
            ws.id,
            {
                limit: this.paginationLimit,
                offset: this.members.length,
            },
            { created_at: DateOrderEnum.desc },
        );

        if (!members.length) {
            this.reachedMaxLimit = true;
            return;
        }

        this.add(members);
    }

    add(members: WorkspaceMember[]) {
        this.addToMap(members);
        this.members = [...this.members, ...members];
    }

    async load(): Promise<void> {
        this.loading = true;
        this.members = [];
        this.membersById.clear();
        this.reachedMaxLimit = false;
        try {
            await this.get();
        } catch (error) {
            this.logger.error("Error loading workspace members", error);
        } finally {
            this.loading = false;
        }
    }

    private addToMap(members: WorkspaceMember[]) {
        members.forEach(m => {
            this.membersById.set(m.id, m);
        });
    }

    async getById(id: string): Promise<WorkspaceMember | undefined> {
        return this.membersById.get(id);
    }
}
