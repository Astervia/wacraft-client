import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AuthService } from "../../core/auth/service/auth.service";
import { AuthControllerService } from "../../core/auth/controller/auth-controller.service";
import { WorkspaceStoreService } from "../../core/workspace/store/workspace-store.service";
import { RoutePath } from "../app.routes";
import { isHttpError } from "../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-invitation",
    imports: [CommonModule, RouterModule],
    templateUrl: "./invitation.component.html",
    standalone: true,
})
export class InvitationComponent implements OnInit {
    private authService = inject(AuthService);
    private authController = inject(AuthControllerService);
    private workspaceStore = inject(WorkspaceStoreService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    isLoading = true;
    errorMessage = "";

    RoutePath = RoutePath;

    async ngOnInit(): Promise<void> {
        const token = this.route.snapshot.queryParams["token"] || "";
        if (!token) {
            this.errorMessage = "No invitation token provided.";
            this.isLoading = false;
            return;
        }

        if (!this.authService.getToken()) {
            localStorage.setItem("pendingInvitationToken", token);
            this.router.navigate([`/${RoutePath.auth}/${RoutePath.login}`]);
            return;
        }

        await this.claimInvitation(token);
    }

    async claimInvitation(token: string): Promise<void> {
        this.isLoading = true;
        this.errorMessage = "";
        try {
            const result = await this.authController.claimInvitation(token);
            await this.workspaceStore.loadWorkspaces();
            const workspace = this.workspaceStore.workspaces.find(
                w => w.id === result.workspace_id,
            );
            if (workspace) {
                this.workspaceStore.setCurrentWorkspace(workspace);
            }
            this.router.navigate([`/${RoutePath.home}`]);
        } catch (error: unknown) {
            if (isHttpError(error)) {
                this.errorMessage =
                    error.response?.data?.description || "Failed to accept invitation.";
            } else {
                this.errorMessage = "Failed to accept invitation.";
            }
            this.isLoading = false;
        }
    }
}
