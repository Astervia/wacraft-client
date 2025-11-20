import { Component, OnInit, inject } from "@angular/core";
import { environment } from "../../environments/environment";

import { SafeUrlPipe } from "../../core/common/pipe/safe-url.pipe";
import { UrlWithHttpPipe } from "../../core/common/pipe/url-with-http.pipe";
import { AuthService } from "../../core/auth/service/auth.service";

@Component({
    selector: "app-node-red",
    imports: [SafeUrlPipe, UrlWithHttpPipe],
    templateUrl: "./node-red.component.html",
    styleUrl: "./node-red.component.scss",
    standalone: true,
})
export class NodeRedComponent implements OnInit {
    authService = inject(AuthService);

    environment = environment;
    accessToken = "";

    ngOnInit() {
        this.accessToken = this.authService.getToken();
        this.authService.token.subscribe(token => {
            this.authService.setAuthCookie();
            if (token) {
                this.accessToken = token;
            }
        });
    }
}
