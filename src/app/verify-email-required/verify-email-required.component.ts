import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { AuthControllerService } from "../../core/auth/controller/auth-controller.service";
import { AuthService } from "../../core/auth/service/auth.service";
import { UserStoreService } from "../../core/user/store/user-store.service";
import { RoutePath } from "../app.routes";
import { isHttpError } from "../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-verify-email-required",
    imports: [CommonModule, RouterModule],
    templateUrl: "./verify-email-required.component.html",
    styleUrl: "./verify-email-required.component.scss",
    standalone: true,
})
export class VerifyEmailRequiredComponent {
    private authController = inject(AuthControllerService);
    private authService = inject(AuthService);
    userStore = inject(UserStoreService);

    RoutePath = RoutePath;

    isResending = false;
    successMessage = "";
    errorMessage = "";

    async resendVerification(): Promise<void> {
        this.isResending = true;
        this.successMessage = "";
        this.errorMessage = "";

        try {
            const result = await this.authController.resendVerification(
                this.userStore.currentUser.email,
            );
            this.successMessage = result.message || "Verification email sent.";
        } catch (error: unknown) {
            if (isHttpError(error)) {
                this.errorMessage =
                    error.response?.data?.description || "Failed to resend verification email.";
            } else {
                this.errorMessage = "Failed to resend verification email.";
            }
        } finally {
            this.isResending = false;
        }
    }

    logout(): void {
        this.authService.logout();
    }
}
