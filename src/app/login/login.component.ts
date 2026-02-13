import { Component, ElementRef, ViewChild, inject, OnDestroy } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { AuthService } from "../../core/auth/service/auth.service";
import { AuthModule } from "../../core/auth/auth.module";
import { UserModule } from "../../core/user/user.module";
import { UserStoreService } from "../../core/user/store/user-store.service";
import { isHttpError } from "../../core/common/model/http-error-shape.model";
import { CountdownPipe } from "../../core/common/pipe/countdown.pipe";

@Component({
    selector: "app-login",
    imports: [AuthModule, UserModule, RouterModule, CountdownPipe],
    templateUrl: "./login.component.html",
    styleUrl: "./login.component.scss",
    standalone: true,
})
export class LoginComponent implements OnDestroy {
    private authService = inject(AuthService);
    private userStore = inject(UserStoreService);
    private router = inject(Router);

    isLoading = false;
    rateLimitSeconds = 0;
    private countdownInterval?: ReturnType<typeof setInterval>;

    @ViewChild("username") username!: ElementRef;
    @ViewChild("password") password!: ElementRef;

    errorMessage?: string;

    async login(): Promise<void> {
        this.isLoading = true;
        this.errorMessage = undefined;
        this.clearCountdown();

        const email = this.username.nativeElement.value;
        const password = this.password.nativeElement.value;
        try {
            await this.authService.login(email, password);
            await this.userStore.getCurrent();
            this.router.navigate([""]);
        } catch (error: unknown) {
            const response = (
                error as { response?: { status?: number; headers?: Record<string, string> } }
            )?.response;
            if (response?.status === 429) {
                const resetTimestamp = parseInt(response.headers?.["x-ratelimit-reset"] || "0", 10);
                const retryAfter = parseInt(response.headers?.["retry-after"] || "0", 10);
                const seconds =
                    resetTimestamp > 0
                        ? Math.max(0, resetTimestamp - Math.floor(Date.now() / 1000))
                        : retryAfter;
                this.startCountdown(seconds || 60);
            } else if (isHttpError(error)) {
                this.errorMessage =
                    error.response?.data?.description || "Some error occurred logging in";
            } else if (error instanceof Error) {
                this.errorMessage = error.message;
            } else {
                this.errorMessage = "Some error occurred logging in";
            }
        } finally {
            this.isLoading = false;
        }
    }

    private startCountdown(seconds: number): void {
        this.clearCountdown();
        this.rateLimitSeconds = seconds;
        this.countdownInterval = setInterval(() => {
            this.rateLimitSeconds--;
            if (this.rateLimitSeconds <= 0) {
                this.clearCountdown();
            }
        }, 1000);
    }

    private clearCountdown(): void {
        this.rateLimitSeconds = 0;
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = undefined;
        }
    }

    ngOnDestroy(): void {
        this.clearCountdown();
    }

    showPassword = false;
    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }
}
