import { Injectable, Renderer2 } from "@angular/core";
import { UnreadMode } from "./../core/local-config/model/unread-mode.model";
import { getThemeMode, ThemeMode } from "../core/common/model/theme-modes.model";

@Injectable({
    providedIn: "root",
})
export class LocalSettingsService {
    autoPreview: {
        image: boolean;
        video: boolean;
        audio: boolean;
        sticker: boolean;
    } = {
        image: localStorage.getItem("autoPreviewImage")
            ? localStorage.getItem("autoPreviewImage") === "true"
            : true,
        video: localStorage.getItem("autoPreviewVideo")
            ? localStorage.getItem("autoPreviewVideo") === "true"
            : true,
        audio: localStorage.getItem("autoPreviewAudio")
            ? localStorage.getItem("autoPreviewAudio") === "true"
            : true,
        sticker: localStorage.getItem("autoPreviewSticker")
            ? localStorage.getItem("autoPreviewSticker") === "true"
            : true,
    };
    unreadMode = (localStorage.getItem("unreadMode") as UnreadMode) || UnreadMode.SERVER;

    setAutoPreviewImage(value: boolean) {
        localStorage.setItem("autoPreviewImage", value.toString());
        this.autoPreview.image = value;
    }

    setAutoPreviewVideo(value: boolean) {
        localStorage.setItem("autoPreviewVideo", value.toString());
        this.autoPreview.video = value;
    }

    setAutoPreviewAudio(value: boolean) {
        localStorage.setItem("autoPreviewAudio", value.toString());
        this.autoPreview.audio = value;
    }

    setAutoPreviewSticker(value: boolean) {
        localStorage.setItem("autoPreviewSticker", value.toString());
        this.autoPreview.sticker = value;
    }

    setAutoPreviewSettings(setting: "image" | "video" | "sticker" | "audio", value: boolean) {
        this.autoPreview[setting] = value;
        localStorage.setItem(
            `autoPreview${setting.charAt(0).toUpperCase() + setting.slice(1)}`,
            String(value),
        );
    }

    setUnreadMode(value: UnreadMode) {
        localStorage.setItem("unreadMode", value);
        this.unreadMode = value;
    }

    themeMode: ThemeMode = getThemeMode(localStorage.getItem("themeMode"));
    setThemeMode(value: ThemeMode) {
        this.themeMode = value;
        localStorage.setItem("themeMode", value);
    }

    // Method to update the theme
    updateTheme(renderer: Renderer2) {
        switch (this.themeMode) {
            case ThemeMode.dark:
                return renderer.addClass(document.documentElement, "dark");
            case ThemeMode.light:
                return renderer.removeClass(document.documentElement, "dark");
        }

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (prefersDark) return renderer.addClass(document.documentElement, "dark");

        renderer.removeClass(document.documentElement, "dark");
    }

    autoMarkAsRead =
        localStorage.getItem("autoMarkAsRead") === "true" ||
        localStorage.getItem("autoMarkAsRead") === null;
    setAutoMarkAsRead(value: boolean) {
        this.autoMarkAsRead = value;
        localStorage.setItem("autoMarkAsRead", String(value));
    }

    sendTyping =
        localStorage.getItem("sendTyping") === "true" ||
        localStorage.getItem("sendTyping") === null;
    setSendTyping(value: boolean) {
        this.sendTyping = value;
        localStorage.setItem("sendTyping", String(value));
    }

    locale: string = localStorage.getItem("locale") || navigator.language || "en-US";
    setLocale(value: string | null) {
        if (value) {
            localStorage.setItem("locale", value);
            this.locale = value;
        } else {
            localStorage.removeItem("locale");
            this.locale = navigator.language || "en-US";
        }
    }
}
