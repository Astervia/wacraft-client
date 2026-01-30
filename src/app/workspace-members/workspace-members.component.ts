import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../app.routes";
import { WorkspaceStoreService } from "../../core/workspace/store/workspace-store.service";
import { WorkspaceMemberStoreService } from "../../core/workspace/store/workspace-member-store.service";
import { WorkspaceMemberControllerService } from "../../core/workspace/controller/workspace-member-controller.service";
import { WorkspaceMember } from "../../core/workspace/entity/workspace-member.entity";
import {
    Policy,
    AdminPolicies,
    MemberPolicies,
    ViewerPolicies,
} from "../../core/workspace/model/policy.model";

@Component({
    selector: "app-workspace-members",
    imports: [CommonModule, FormsModule, SidebarLayoutComponent],
    templateUrl: "./workspace-members.component.html",
    standalone: true,
})
export class WorkspaceMembersComponent implements OnInit {
    workspaceStore = inject(WorkspaceStoreService);
    memberStore = inject(WorkspaceMemberStoreService);
    private memberController = inject(WorkspaceMemberControllerService);

    RoutePath = RoutePath;
    Policy = Policy;
    AdminPolicies = AdminPolicies;
    MemberPolicies = MemberPolicies;
    ViewerPolicies = ViewerPolicies;
    allPolicies = Object.values(Policy);

    invitations: unknown[] = [];
    errorMessage = "";

    // Invite form
    showInviteForm = false;
    inviteEmail = "";
    invitePolicies: Policy[] = [...MemberPolicies];
    inviteLoading = false;

    // Edit member
    editingMemberId: string | null = null;
    editPolicies: Policy[] = [];

    private scrolling = false;

    async ngOnInit(): Promise<void> {
        await this.loadMembers();
    }

    async loadMembers(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        try {
            await this.memberStore.load();
            this.invitations = await this.memberController.getInvitations(ws.id);
        } catch {
            this.errorMessage = "Failed to load members.";
        }
    }

    onScroll(event: Event) {
        const element = event.target as HTMLElement;
        if (
            !(
                element.scrollHeight - element.scrollTop <= element.clientHeight + 100 &&
                !this.scrolling
            )
        )
            return;

        if (!this.memberStore.reachedMaxLimit && !this.memberStore.loading) this.getMore();
    }

    async getMore(): Promise<void> {
        this.scrolling = true;
        try {
            await this.memberStore.get();
        } catch {
            this.errorMessage = "Failed to load more members.";
        } finally {
            this.scrolling = false;
        }
    }

    startEditMember(member: WorkspaceMember): void {
        this.editingMemberId = member.id;
        this.editPolicies = [...(member.policies || [])];
    }

    cancelEdit(): void {
        this.editingMemberId = null;
        this.editPolicies = [];
    }

    async saveEditMember(member: WorkspaceMember): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        try {
            await this.memberController.updateMemberPolicies(ws.id, member.id, this.editPolicies);
            this.editingMemberId = null;
            await this.loadMembers();
        } catch {
            this.errorMessage = "Failed to update member.";
        }
    }

    async removeMember(member: WorkspaceMember): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        if (!confirm("Remove this member from the workspace?")) return;
        try {
            await this.memberController.removeMember(ws.id, member.id);
            await this.loadMembers();
        } catch {
            this.errorMessage = "Failed to remove member.";
        }
    }

    toggleInvitePolicy(policy: Policy): void {
        const idx = this.invitePolicies.indexOf(policy);
        if (idx >= 0) {
            this.invitePolicies.splice(idx, 1);
        } else {
            this.invitePolicies.push(policy);
        }
    }

    toggleEditPolicy(policy: Policy): void {
        const idx = this.editPolicies.indexOf(policy);
        if (idx >= 0) {
            this.editPolicies.splice(idx, 1);
        } else {
            this.editPolicies.push(policy);
        }
    }

    setInvitePreset(preset: "admin" | "member" | "viewer"): void {
        if (preset === "admin") this.invitePolicies = [...AdminPolicies];
        else if (preset === "member") this.invitePolicies = [...MemberPolicies];
        else this.invitePolicies = [...ViewerPolicies];
    }

    setEditPreset(preset: "admin" | "member" | "viewer"): void {
        if (preset === "admin") this.editPolicies = [...AdminPolicies];
        else if (preset === "member") this.editPolicies = [...MemberPolicies];
        else this.editPolicies = [...ViewerPolicies];
    }

    async invite(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws || !this.inviteEmail.trim()) return;
        this.inviteLoading = true;
        try {
            await this.memberController.inviteMember(ws.id, {
                email: this.inviteEmail.trim(),
                policies: this.invitePolicies,
            });
            this.inviteEmail = "";
            this.showInviteForm = false;
            await this.loadMembers();
        } catch {
            this.errorMessage = "Failed to send invitation.";
        } finally {
            this.inviteLoading = false;
        }
    }

    async revokeInvitation(invitation: { id: string }): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        try {
            await this.memberController.revokeInvitation(ws.id, invitation.id);
            await this.loadMembers();
        } catch {
            this.errorMessage = "Failed to revoke invitation.";
        }
    }
}
