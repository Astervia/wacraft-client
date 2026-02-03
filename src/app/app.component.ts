import { Component, inject, signal } from "@angular/core";
import { Router, RouterOutlet, NavigationEnd } from "@angular/router";
import { GoogleMapsModule } from "@angular/google-maps";
import { Title } from "@angular/platform-browser";
import { environment } from "../environments/environment";
import { filter, take } from "rxjs";

@Component({
    selector: "app-root",
    imports: [RouterOutlet, GoogleMapsModule],
    templateUrl: "./app.component.html",
    styleUrl: "./app.component.scss",
    standalone: true,
})
export class AppComponent {
    private titleService = inject(Title);
    private router = inject(Router);

    isLoading = signal(true);

    constructor() {
        this.titleService.setTitle(environment.appTitle);

        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                take(1)
            )
            .subscribe(() => {
                this.isLoading.set(false);
            });
    }

    title = "wacraft-client";
}
