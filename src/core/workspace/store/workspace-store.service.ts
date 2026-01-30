import { Injectable, inject } from "@angular/core";
import { Subject } from "rxjs";
import { NGXLogger } from "ngx-logger";
import { Workspace } from "../entity/workspace.entity";
import { WorkspaceMember } from "../entity/workspace-member.entity";
import { WorkspaceControllerService } from "../controller/workspace-controller.service";
import { WorkspaceMemberControllerService } from "../controller/workspace-member-controller.service";
import { WorkspaceContextService } from "./workspace-context.service";
import { UserStoreService } from "../../user/store/user-store.service";
import { Policy, hasPolicy } from "../model/policy.model";

@Injectable({
    providedIn: "root",
})
export class WorkspaceStoreService {
    private workspaceController = inject(WorkspaceControllerService);
    private memberController = inject(WorkspaceMemberControllerService);
    private workspaceContext = inject(WorkspaceContextService);
    private userStore = inject(UserStoreService);
    private logger = inject(NGXLogger);

    workspaces: Workspace[] = [];
    currentWorkspace: Workspace | null = null;
    currentMembership: WorkspaceMember | null = null;

    workspaceChanged = new Subject<Workspace>();

    async loadWorkspaces(): Promise<void> {
        try {
            this.workspaces = await this.workspaceController.get();
        } catch (error) {
            this.logger.error("Error loading workspaces", error);
        }
    }

    async loadCurrentMembership(): Promise<void> {
        if (!this.currentWorkspace) return;
        try {
            const members = await this.memberController.getMembers(this.currentWorkspace.id);
            const userId = this.userStore.currentUser?.id;
            this.currentMembership = members.find(m => m.user_id === userId) ?? null;
        } catch (error) {
            this.logger.error("Error loading current membership", error);
        }
    }

    setCurrentWorkspace(workspace: Workspace): void {
        this.currentWorkspace = workspace;
        this.workspaceContext.setWorkspaceId(workspace.id);
        this.workspaceChanged.next(workspace);
        this.loadCurrentMembership();
    }

    restoreWorkspace(): void {
        const savedId = localStorage.getItem("currentWorkspaceId");
        if (savedId) {
            const found = this.workspaces.find(w => w.id === savedId);
            if (found) {
                this.currentWorkspace = found;
                this.workspaceContext.setWorkspaceId(found.id);
                this.workspaceChanged.next(found);
                this.loadCurrentMembership();
                return;
            }
        }
        if (this.workspaces.length > 0) {
            this.setCurrentWorkspace(this.workspaces[0]);
        }
    }

    hasPolicy(policy: Policy): boolean {
        if (!this.currentMembership?.policies) return false;
        return hasPolicy(this.currentMembership.policies, policy);
    }

    get currentPolicies(): Policy[] {
        if (!this.currentMembership?.policies) return [];
        return this.currentMembership.policies;
    }
}
