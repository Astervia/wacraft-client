
import { Component, ElementRef, ViewChild, inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth/service/auth.service";
import { AuthModule } from "../../core/auth/auth.module";
import { UserModule } from "../../core/user/user.module";
import { isHttpError } from "../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-login",
    imports: [AuthModule, UserModule],
    templateUrl: "./login.component.html",
    styleUrl: "./login.component.scss",
    standalone: true,
})
export class LoginComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    isLoading = false;

    @ViewChild("username") username!: ElementRef;
    @ViewChild("password") password!: ElementRef;

    errorMessage?: string;

    async login(): Promise<void> {
        this.isLoading = true;

        const email = this.username.nativeElement.value;
        const password = this.password.nativeElement.value;
        try {
            await this.authService.login(email, password);
            this.router.navigate([""]);
        } catch (error: unknown) {
            if (isHttpError(error)) {
                this.errorMessage =
                    error.response?.data?.description || "Some error occurred login in";
            } else if (error instanceof Error) {
                this.errorMessage = error.message;
            } else {
                this.errorMessage = "Some error occurred login in";
            }
        } finally {
            this.isLoading = false;
        }
    }

    showPassword = false;
    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }
}
