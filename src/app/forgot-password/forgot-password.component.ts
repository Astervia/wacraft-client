import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { AuthControllerService } from "../../core/auth/controller/auth-controller.service";
import { isHttpError } from "../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-forgot-password",
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: "./forgot-password.component.html",
    standalone: true,
})
export class ForgotPasswordComponent {
    private authController = inject(AuthControllerService);

    email = "";
    isLoading = false;
    errorMessage = "";
    successMessage = "";

    async submit(): Promise<void> {
        if (!this.email.trim()) return;
        this.isLoading = true;
        this.errorMessage = "";
        try {
            const result = await this.authController.forgotPassword(this.email);
            this.successMessage =
                result.message ||
                "If an account exists with that email, a reset link has been sent.";
        } catch (error: unknown) {
            if (isHttpError(error)) {
                this.errorMessage =
                    error.response?.data?.description || "Failed to send reset email.";
            } else {
                this.errorMessage = "Failed to send reset email.";
            }
        } finally {
            this.isLoading = false;
        }
    }
}
