import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { AuthControllerService } from "../../core/auth/controller/auth-controller.service";
import { isHttpError } from "../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-verify-email",
    imports: [CommonModule, RouterModule],
    templateUrl: "./verify-email.component.html",
    standalone: true,
})
export class VerifyEmailComponent implements OnInit {
    private authController = inject(AuthControllerService);
    private route = inject(ActivatedRoute);

    isLoading = true;
    successMessage = "";
    errorMessage = "";

    async ngOnInit(): Promise<void> {
        const token = this.route.snapshot.queryParams["token"];
        if (!token) {
            this.errorMessage = "No verification token provided.";
            this.isLoading = false;
            return;
        }
        try {
            const result = await this.authController.verifyEmail(token);
            this.successMessage = result.message || "Email verified successfully.";
        } catch (error: unknown) {
            if (isHttpError(error)) {
                this.errorMessage =
                    error.response?.data?.description || "Email verification failed.";
            } else {
                this.errorMessage = "Email verification failed.";
            }
        } finally {
            this.isLoading = false;
        }
    }
}
