import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../../../core/auth/service/auth.service";

@Component({
    selector: "app-token-replacer",
    imports: [CommonModule, FormsModule],
    templateUrl: "./token-replacer.component.html",
    standalone: true,
})
export class TokenReplacerComponent {
    private authService = inject(AuthService);

    newAccessToken = "";
    newRefreshToken = "";
    applied = false;

    get currentAccessToken(): string {
        const token = this.authService.getToken();
        if (!token) return "(none)";
        return token.length > 48 ? `${token.slice(0, 24)}…${token.slice(-24)}` : token;
    }

    get currentRefreshToken(): string {
        const token = localStorage.getItem("refreshToken") ?? "";
        if (!token) return "(none)";
        return token.length > 48 ? `${token.slice(0, 24)}…${token.slice(-24)}` : token;
    }

    apply() {
        if (this.newAccessToken) {
            this.authService.setToken(this.newAccessToken.trim());
        }
        if (this.newRefreshToken) {
            localStorage.setItem("refreshToken", this.newRefreshToken.trim());
        }
        this.applied = true;
        setTimeout(
            () => (window.location.href = window.location.origin + window.location.pathname),
            600,
        );
    }
}
