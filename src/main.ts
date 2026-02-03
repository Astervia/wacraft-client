/// <reference types="@angular/localize" />

import { bootstrapApplication } from "@angular/platform-browser";
import { appConfig } from "./app/app.config";
import { AppComponent } from "./app/app.component";
import { environment } from "./environments/environment";
import { getThemeMode, ThemeMode } from "./core/common/model/theme-modes.model";

// Inject Google Maps Script
function loadGoogleMaps(apiKey: string) {
    return new Promise<void>((resolve, reject) => {
        const existingScript = document.getElementById("googleMaps");

        if (existingScript) {
            resolve();
        } else {
            const script = document.createElement("script");
            script.id = "googleMaps";
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;

            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Google Maps could not be loaded."));

            document.head.appendChild(script);
        }
    });
}

// Dark Mode Toggle
const themeMode = getThemeMode(localStorage.getItem("themeMode"));
switch (themeMode) {
    case ThemeMode.dark:
        document.documentElement.classList.add("dark");
        break;
    case ThemeMode.light:
        document.documentElement.classList.remove("dark");
        break;
    default: {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (prefersDark) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
    }
}

// Load the Google Maps API before bootstrapping the app (if API key is configured)
const hasGoogleMapsApiKey =
    !!environment.googleMapsApiKey && environment.googleMapsApiKey !== "undefined";

if (hasGoogleMapsApiKey) {
    loadGoogleMaps(environment.googleMapsApiKey!)
        .then(() => {
            bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
        })
        .catch(err => console.error(err));
} else {
    // Bootstrap without Google Maps (OpenStreetMap will be used)
    bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
}
