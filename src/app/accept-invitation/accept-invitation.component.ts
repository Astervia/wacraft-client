import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AuthControllerService } from "../../core/auth/controller/auth-controller.service";
import { isHttpError } from "../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-accept-invitation",
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: "./accept-invitation.component.html",
    standalone: true,
})
export class AcceptInvitationComponent implements OnInit {
    private authController = inject(AuthControllerService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    token = "";
    isNewUser = false;
    name = "";
    password = "";
    isLoading = false;
    errorMessage = "";
    successMessage = "";

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParams["token"] || "";
        this.isNewUser = this.route.snapshot.queryParams["new_user"] === "true";
    }

    async accept(): Promise<void> {
        if (!this.token) {
            this.errorMessage = "No invitation token provided.";
            return;
        }
        this.isLoading = true;
        this.errorMessage = "";
        try {
            const data = this.isNewUser ? { name: this.name, password: this.password } : undefined;
            const result = await this.authController.acceptInvitation(this.token, data);
            this.successMessage = result.message || "Invitation accepted.";
        } catch (error: unknown) {
            if (isHttpError(error)) {
                this.errorMessage =
                    error.response?.data?.description || "Failed to accept invitation.";
            } else {
                this.errorMessage = "Failed to accept invitation.";
            }
        } finally {
            this.isLoading = false;
        }
    }
}
