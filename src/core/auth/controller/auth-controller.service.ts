import { Injectable } from "@angular/core";
import axios, { AxiosInstance } from "axios";
import { environment } from "../../../environments/environment";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";

@Injectable({
    providedIn: "root",
})
export class AuthControllerService {
    private prefix: string;
    private http: AxiosInstance;

    constructor() {
        this.prefix = `http${environment.mainServerSecurity ? "s" : ""}://${environment.mainServerUrl}/${ServerEndpoints.auth}`;
        this.http = axios.create({
            baseURL: this.prefix,
        });
    }

    async register(data: {
        name: string;
        email: string;
        password: string;
    }): Promise<{ message: string }> {
        return (await this.http.post<{ message: string }>(ServerEndpoints.register, data)).data;
    }

    async verifyEmail(token: string): Promise<{ message: string }> {
        return (
            await this.http.get<{ message: string }>(ServerEndpoints.verify_email, {
                params: { token },
            })
        ).data;
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        return (
            await this.http.post<{ message: string }>(ServerEndpoints.forgot_password, {
                email,
            })
        ).data;
    }

    async resetPassword(token: string, password: string): Promise<{ message: string }> {
        return (
            await this.http.post<{ message: string }>(ServerEndpoints.resetPassword, {
                token,
                password,
            })
        ).data;
    }

    async acceptInvitation(
        token: string,
        data?: { name?: string; password?: string },
    ): Promise<{ message: string }> {
        return (
            await this.http.post<{ message: string }>(ServerEndpoints.accept_invitation, {
                token,
                ...data,
            })
        ).data;
    }

    async resendVerification(email: string): Promise<{ message: string }> {
        return (
            await this.http.post<{ message: string }>(ServerEndpoints.resend_verification, {
                email,
            })
        ).data;
    }
}
