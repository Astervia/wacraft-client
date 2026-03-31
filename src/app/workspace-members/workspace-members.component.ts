import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { CopyButtonComponent } from "../common/copy-button/copy-button.component";
import { RoutePath } from "../app.routes";
import { WorkspaceStoreService } from "../../core/workspace/store/workspace-store.service";
import {
    WorkspaceMemberStoreService,
    WorkspaceInvitation,
} from "../../core/workspace/store/workspace-member-store.service";
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
    imports: [CommonModule, FormsModule, SidebarLayoutComponent, CopyButtonComponent],
    templateUrl: "./workspace-members.component.html",
    standalone: true,
})
export class WorkspaceMembersComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    workspaceStore = inject(WorkspaceStoreService);
    memberStore = inject(WorkspaceMemberStoreService);
    private memberController = inject(WorkspaceMemberControllerService);

    RoutePath = RoutePath;
    Policy = Policy;
    AdminPolicies = AdminPolicies;
    MemberPolicies = MemberPolicies;
    ViewerPolicies = ViewerPolicies;
    allPolicies = Object.values(Policy);

    errorMessage = "";

    // Scope toggle
    memberScope: "members" | "invitations" = "members";

    // Invite form
    showInviteForm = false;
    inviteEmail = "";
    invitePolicies: Policy[] = [...MemberPolicies];
    inviteLoading = false;

    // Edit member
    editingMemberId: string | null = null;
    editPolicies: Policy[] = [];

    private scrolling = false;

    get isLoading(): boolean {
        return this.memberScope === "members"
            ? this.memberStore.loading
            : this.memberStore.invitationLoading;
    }

    get reachedMax(): boolean {
        return this.memberScope === "members"
            ? this.memberStore.reachedMaxLimit
            : this.memberStore.reachedMaxInvitationLimit;
    }

    ngOnInit(): void {
        this.route.fragment.subscribe(fragment => {
            if (fragment === "invitations") {
                this.memberScope = "invitations";
                if (this.memberStore.invitations.length === 0) {
                    this.memberStore.loadInvitations();
                }
            } else {
                this.memberScope = "members";
                if (fragment !== "members") {
                    this.router.navigate([], {
                        fragment: "members",
                        replaceUrl: true,
                        queryParamsHandling: "preserve",
                    });
                }
                if (this.memberStore.members.length === 0) {
                    this.memberStore.load();
                }
            }
        });
    }

    selectScope(scope: "members" | "invitations"): void {
        this.router.navigate([], {
            fragment: scope,
            queryParamsHandling: "preserve",
        });
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

        if (!this.reachedMax && !this.isLoading) this.getMore();
    }

    async getMore(): Promise<void> {
        this.scrolling = true;
        try {
            if (this.memberScope === "members") {
                await this.memberStore.get();
            } else {
                await this.memberStore.getInvitations();
            }
        } catch {
            this.errorMessage = "Failed to load more.";
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
            await this.memberStore.load();
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
            await this.memberStore.load();
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
            await this.memberStore.loadInvitations();
        } catch {
            this.errorMessage = "Failed to send invitation.";
        } finally {
            this.inviteLoading = false;
        }
    }

    getInviteLink(token: string): string {
        return `${window.location.origin}/invitation?token=${token}`;
    }

    async revokeInvitation(invitation: WorkspaceInvitation): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        try {
            await this.memberController.revokeInvitation(ws.id, invitation.id);
            await this.memberStore.loadInvitations();
        } catch {
            this.errorMessage = "Failed to revoke invitation.";
        }
    }
}
