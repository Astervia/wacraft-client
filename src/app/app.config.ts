import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from "@angular/core";
import { provideRouter, ROUTES } from "@angular/router";

import { routesWithPluginsFactory } from "./app.routes";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { PluginsManagerService } from "../plugins/common/service/plugins-manager.service";
import { MatDialogModule } from "@angular/material/dialog";
import { provideAnimations } from "@angular/platform-browser/animations";
import { NgxLoggerLevel, LoggerModule } from "ngx-logger";
import { environment } from "../environments/environment";
import { provideHttpClient } from "@angular/common/http";
import { provideServiceWorker } from "@angular/service-worker";

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        {
            provide: ROUTES,
            multi: true,
            useFactory: routesWithPluginsFactory,
            deps: [PluginsManagerService],
        },
        // Then pass an empty array to the router, letting ROUTES fill it in:
        provideRouter([]),
        // provideRouter(routes),
        provideAnimationsAsync(),
        provideAnimations(),
        provideHttpClient(),
        importProvidersFrom(MatDialogModule),
        importProvidersFrom(
            LoggerModule.forRoot({
                level:
                    environment.env === "production" ? NgxLoggerLevel.INFO : NgxLoggerLevel.DEBUG,
                disableConsoleLogging: false,
            }),
        ),
        provideServiceWorker("ngsw-worker.js", {
            enabled: environment.env === "production",
            registrationStrategy: "registerWhenStable:30000",
        }),
    ],
};
