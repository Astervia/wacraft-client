import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { AuthControllerService } from "../../core/auth/controller/auth-controller.service";
import { isHttpError } from "../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-register",
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: "./register.component.html",
    standalone: true,
})
export class RegisterComponent {
    private authController = inject(AuthControllerService);
    private router = inject(Router);

    name = "";
    email = "";
    password = "";
    confirmPassword = "";
    isLoading = false;
    errorMessage = "";
    successMessage = "";
    showPassword = false;

    async register(): Promise<void> {
        if (this.password !== this.confirmPassword) {
            this.errorMessage = "Passwords do not match.";
            return;
        }
        this.isLoading = true;
        this.errorMessage = "";
        try {
            const result = await this.authController.register({
                name: this.name,
                email: this.email,
                password: this.password,
            });
            this.successMessage =
                result.message || "Registration successful. Please check your email to verify.";
        } catch (error: unknown) {
            if (isHttpError(error)) {
                this.errorMessage = error.response?.data?.description || "Registration failed.";
            } else {
                this.errorMessage = "Registration failed.";
            }
        } finally {
            this.isLoading = false;
        }
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }
}
