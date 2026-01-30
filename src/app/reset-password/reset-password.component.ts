import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { AuthControllerService } from "../../core/auth/controller/auth-controller.service";
import { isHttpError } from "../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-reset-password",
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: "./reset-password.component.html",
    standalone: true,
})
export class ResetPasswordComponent {
    private authController = inject(AuthControllerService);
    private route = inject(ActivatedRoute);

    password = "";
    confirmPassword = "";
    isLoading = false;
    errorMessage = "";
    successMessage = "";
    showPassword = false;

    async submit(): Promise<void> {
        if (this.password !== this.confirmPassword) {
            this.errorMessage = "Passwords do not match.";
            return;
        }
        const token = this.route.snapshot.queryParams["token"];
        if (!token) {
            this.errorMessage = "No reset token provided.";
            return;
        }
        this.isLoading = true;
        this.errorMessage = "";
        try {
            const result = await this.authController.resetPassword(token, this.password);
            this.successMessage = result.message || "Password reset successfully.";
        } catch (error: unknown) {
            if (isHttpError(error)) {
                this.errorMessage = error.response?.data?.description || "Password reset failed.";
            } else {
                this.errorMessage = "Password reset failed.";
            }
        } finally {
            this.isLoading = false;
        }
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }
}
