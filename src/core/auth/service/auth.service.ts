import { Injectable, inject } from "@angular/core";
import axios, { AxiosInstance } from "axios";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { Subject } from "rxjs";
import { environment } from "../../../environments/environment";
import { Router } from "@angular/router";
import { TokenResponse } from "../model/token-response.model";
import { TokenRequest } from "../model/token-request.model";
import { GrantType } from "../enum/grant-type.enum";

@Injectable({
    providedIn: "root",
})
export class AuthService {
    private router = inject(Router);

    private prefix = "";
    private http: AxiosInstance;
    private refreshTokenTimeout!: NodeJS.Timeout;

    token: Subject<string> = new Subject<string>();

    constructor() {
        this.prefix = `http${environment.mainServerSecurity ? "s" : ""}://${
            environment.mainServerUrl
        }/${ServerEndpoints.user}/${ServerEndpoints.oauth}`;

        this.http = axios.create({
            baseURL: this.prefix,
        });
    }

    async login(username: string, password: string): Promise<TokenResponse> {
        const response = await this.http.post<TokenResponse>(`${ServerEndpoints.token}`, {
            username,
            password,
            grant_type: GrantType.password,
        } as TokenRequest);
        this.setToken(response.data.access_token);
        localStorage.setItem("refreshToken", response.data.refresh_token);

        // Store the login time
        this.loginTime = new Date();

        // Schedule the token refresh
        this.scheduleTokenRefresh();

        return response.data;
    }

    private refreshInProgress?: Promise<TokenResponse>;

    async refreshAuthToken(): Promise<TokenResponse> {
        if (this.refreshInProgress) return this.refreshInProgress;

        const refresh_token = localStorage.getItem("refreshToken");
        this.refreshInProgress = this.http
            .post<TokenResponse>(`${ServerEndpoints.token}`, {
                refresh_token,
                grant_type: GrantType.refresh_token,
            } as TokenRequest)
            .then(response => {
                this.setToken(response.data.access_token);
                localStorage.setItem("refreshToken", response.data.refresh_token);
                this.loginTime = new Date();
                return response.data;
            })
            .finally(() => {
                this.refreshInProgress = undefined;
            });

        return this.refreshInProgress;
    }

    setToken(token: string): void {
        this.token.next(token);
        localStorage.setItem("accessToken", token);
    }

    async checkAndRefreshToken(): Promise<void> {
        const currentTime = new Date().getTime();
        const timeElapsed = currentTime - this.loginTime;

        const oneHourMinus10Sec = 3600 * 1000 - 10000; // 1 hour in milliseconds

        if (timeElapsed >= oneHourMinus10Sec) {
            // If more than one hour has passed, refresh the token immediately
            await this.refreshAuthToken()
                .then(() => {
                    this.scheduleTokenRefresh(); // Schedule the next refresh
                })
                .catch(() => {
                    this.logout();
                });

            return;
        }
        // If less than one hour has passed, schedule the refresh
        this.scheduleTokenRefresh(oneHourMinus10Sec - timeElapsed);
    }

    private scheduleTokenRefresh(delay: number = 3600 * 1000 - 10000): void {
        // Clear any existing timeout to avoid multiple timers
        clearTimeout(this.refreshTokenTimeout);

        this.refreshTokenTimeout = setTimeout(() => {
            this.refreshAuthToken()
                .then(() => {
                    this.scheduleTokenRefresh(); // Schedule the next refresh
                })
                .catch(() => {
                    this.logout();
                });
        }, delay);
    }

    getToken(): string {
        return localStorage.getItem("accessToken") || "";
    }

    logout(): void {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        this.loginTime = undefined;
        clearTimeout(this.refreshTokenTimeout);
        this.token.next(""); // Clear the token
        this.router.navigate(["/auth/login"]);
    }

    async resetPassword(
        username: string, // Email
    ): Promise<void> {
        await this.http.post(`${ServerEndpoints.resetPassword}`, { username });
    }

    _loginTime?: number;
    set loginTime(loginTime: Date | undefined) {
        if (!loginTime) {
            this._loginTime = undefined;
            localStorage.removeItem("loginTime");
            return;
        }
        this._loginTime = loginTime.getTime();
        localStorage.setItem("loginTime", this._loginTime.toString());
    }
    get loginTime(): number {
        if (this._loginTime) return this._loginTime;
        return parseInt(localStorage.getItem("loginTime") || "0", 10);
    }
}
