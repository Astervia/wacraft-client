import { Injectable, inject } from "@angular/core";
import { NGXLogger } from "ngx-logger";
import { WorkspaceMember } from "../entity/workspace-member.entity";
import { WorkspaceMemberControllerService } from "../controller/workspace-member-controller.service";
import { WorkspaceStoreService } from "./workspace-store.service";
import { DateOrderEnum } from "../../common/model/date-order.model";
import { MutexSwapper } from "../../synch/mutex-swapper/mutex-swapper";

export interface WorkspaceInvitation {
    id: string;
    email: string;
    token: string;
    policies: string[];
    expires_at: string;
}

@Injectable({
    providedIn: "root",
})
export class WorkspaceMemberStoreService {
    private memberController = inject(WorkspaceMemberControllerService);
    private workspaceStore = inject(WorkspaceStoreService);
    private logger = inject(NGXLogger);

    private listMutex = new MutexSwapper<string>();
    private readonly membersMutexKey = "members";
    private readonly invitationsMutexKey = "invitations";

    private paginationLimit = 15;

    public reachedMaxLimit = false;
    loading = false;

    members: WorkspaceMember[] = [];
    membersById = new Map<string, WorkspaceMember>();

    public reachedMaxInvitationLimit = false;
    invitationLoading = false;
    invitations: WorkspaceInvitation[] = [];
    invitationsById = new Map<string, WorkspaceInvitation>();

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.members = [];
            this.membersById.clear();
            this.reachedMaxLimit = false;
            this.invitations = [];
            this.invitationsById.clear();
            this.reachedMaxInvitationLimit = false;
        });
    }

    private async withMembersLock<T>(fn: () => Promise<T>): Promise<T> {
        await this.listMutex.acquire(this.membersMutexKey);
        try {
            return await fn();
        } finally {
            await this.listMutex.release(this.membersMutexKey);
        }
    }

    private async withInvitationsLock<T>(fn: () => Promise<T>): Promise<T> {
        await this.listMutex.acquire(this.invitationsMutexKey);
        try {
            return await fn();
        } finally {
            await this.listMutex.release(this.invitationsMutexKey);
        }
    }

    async get(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;

        await this.withMembersLock(async () => {
            this.loading = true;
            try {
                const members = await this.memberController.getMembers(
                    ws.id,
                    {
                        limit: this.paginationLimit,
                        offset: this.members.length,
                    },
                    { created_at: DateOrderEnum.desc },
                );

                if (members.length < this.paginationLimit) {
                    this.reachedMaxLimit = true;
                }

                if (members.length) {
                    this.addUnsafe(members);
                }
            } catch (error) {
                this.logger.error("Error loading workspace members", error);
                throw error;
            } finally {
                this.loading = false;
            }
        });
    }

    add(members: WorkspaceMember[]) {
        void this.withMembersLock(async () => {
            this.addUnsafe(members);
        });
    }

    private addUnsafe(members: WorkspaceMember[]) {
        this.addMembersToMembersById(members);
        this.members = [...this.members, ...members];
    }

    private addMembersToMembersById(members: WorkspaceMember[]) {
        members.forEach(m => {
            this.membersById.set(m.id, m);
        });
    }

    async prependMember(member: WorkspaceMember): Promise<void> {
        await this.withMembersLock(async () => {
            this.membersById.set(member.id, member);
            this.members = [member, ...this.members.filter(current => current.id !== member.id)];
        });
    }

    async syncMember(member: WorkspaceMember): Promise<void> {
        await this.withMembersLock(async () => {
            this.membersById.set(member.id, member);
            this.members = this.members.map(current =>
                current.id === member.id ? member : current,
            );
        });
    }

    async removeMember(id: string): Promise<void> {
        await this.withMembersLock(async () => {
            this.membersById.delete(id);
            this.members = this.members.filter(member => member.id !== id);
        });
    }

    async getById(id: string): Promise<WorkspaceMember | undefined> {
        return this.membersById.get(id);
    }

    async getInvitations(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;

        await this.withInvitationsLock(async () => {
            this.invitationLoading = true;
            try {
                const invitations = (await this.memberController.getInvitations(
                    ws.id,
                    {
                        limit: this.paginationLimit,
                        offset: this.invitations.length,
                    },
                    { created_at: DateOrderEnum.desc },
                )) as WorkspaceInvitation[];

                if (invitations.length < this.paginationLimit) {
                    this.reachedMaxInvitationLimit = true;
                }

                if (invitations.length) {
                    this.addInvitationsUnsafe(invitations);
                }
            } catch (error) {
                this.logger.error("Error loading workspace invitations", error);
                throw error;
            } finally {
                this.invitationLoading = false;
            }
        });
    }

    addInvitations(invitations: WorkspaceInvitation[]) {
        void this.withInvitationsLock(async () => {
            this.addInvitationsUnsafe(invitations);
        });
    }

    private addInvitationsUnsafe(invitations: WorkspaceInvitation[]) {
        this.addInvitationsToInvitationsById(invitations);
        this.invitations = [...this.invitations, ...invitations];
    }

    private addInvitationsToInvitationsById(invitations: WorkspaceInvitation[]) {
        invitations.forEach(i => {
            this.invitationsById.set(i.id, i);
        });
    }

    async refetchInvitations(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;

        await this.withInvitationsLock(async () => {
            this.invitationLoading = true;
            this.invitations = [];
            this.invitationsById.clear();
            this.reachedMaxInvitationLimit = false;
            try {
                const invitations = (await this.memberController.getInvitations(
                    ws.id,
                    {
                        limit: this.paginationLimit,
                        offset: 0,
                    },
                    { created_at: DateOrderEnum.desc },
                )) as WorkspaceInvitation[];

                if (invitations.length < this.paginationLimit) {
                    this.reachedMaxInvitationLimit = true;
                }

                if (invitations.length) {
                    this.addInvitationsUnsafe(invitations);
                }
            } catch (error) {
                this.logger.error("Error refetching workspace invitations", error);
                throw error;
            } finally {
                this.invitationLoading = false;
            }
        });
    }

    async removeInvitation(id: string): Promise<void> {
        await this.withInvitationsLock(async () => {
            this.invitationsById.delete(id);
            this.invitations = this.invitations.filter(inv => inv.id !== id);
        });
    }
}
