import { Component, ElementRef, OnInit, Renderer2, ViewChild, inject } from "@angular/core";
import { UserControllerService } from "../../core/user/controller/user-controller.service";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { UnreadMode } from "../../core/local-config/model/unread-mode.model";
import { LocalSettingsService } from "../local-settings.service";
import { AuthService } from "../../core/auth/service/auth.service";
import { UserStoreService } from "../../core/user/store/user-store.service";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatIconModule } from "@angular/material/icon";
import { ThemeMode } from "../../core/common/model/theme-modes.model";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../../core/common/constant/route-path.enum";
import { NGXLogger } from "ngx-logger";
import { TimeoutErrorModalComponent } from "../common/timeout-error-modal/timeout-error-modal.component";
import { isHttpError } from "../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-account",
    imports: [
        CommonModule,
        FormsModule,
        MatTooltipModule,
        MatIconModule,
        SidebarLayoutComponent,
        TimeoutErrorModalComponent,
    ],
    templateUrl: "./account.component.html",
    styleUrl: "./account.component.scss",
    standalone: true,
})
export class AccountComponent implements OnInit {
    private userController = inject(UserControllerService);
    userStore = inject(UserStoreService);
    auth = inject(AuthService);
    localSettings = inject(LocalSettingsService);
    private renderer = inject(Renderer2);
    private logger = inject(NGXLogger);

    RoutePath = RoutePath;

    ThemeMode = ThemeMode;
    UnreadMode = UnreadMode;

    isEditing = false;
    isDropdownOpen = false;
    isLocaleDropdownOpen = false;
    localeSearch = "";
    localeDropdownStyle: Record<string, string> = {};

    @ViewChild("localeTrigger") localeTrigger!: ElementRef<HTMLButtonElement>;

    readonly localeOptions: { code: string; label: string }[] = [
        { code: "en-US", label: "English (United States)" },
        { code: "en-GB", label: "English (United Kingdom)" },
        { code: "en-AU", label: "English (Australia)" },
        { code: "en-CA", label: "English (Canada)" },
        { code: "pt-BR", label: "Português (Brasil)" },
        { code: "pt-PT", label: "Português (Portugal)" },
        { code: "de-DE", label: "Deutsch (Deutschland)" },
        { code: "de-AT", label: "Deutsch (Österreich)" },
        { code: "de-CH", label: "Deutsch (Schweiz)" },
        { code: "fr-FR", label: "Français (France)" },
        { code: "fr-CA", label: "Français (Canada)" },
        { code: "fr-BE", label: "Français (Belgique)" },
        { code: "es-ES", label: "Español (España)" },
        { code: "es-MX", label: "Español (México)" },
        { code: "es-AR", label: "Español (Argentina)" },
        { code: "es-CO", label: "Español (Colombia)" },
        { code: "it-IT", label: "Italiano (Italia)" },
        { code: "nl-NL", label: "Nederlands (Nederland)" },
        { code: "nl-BE", label: "Nederlands (België)" },
        { code: "pl-PL", label: "Polski (Polska)" },
        { code: "ru-RU", label: "Русский (Россия)" },
        { code: "uk-UA", label: "Українська (Україна)" },
        { code: "cs-CZ", label: "Čeština (Česká republika)" },
        { code: "hu-HU", label: "Magyar (Magyarország)" },
        { code: "ro-RO", label: "Română (România)" },
        { code: "sv-SE", label: "Svenska (Sverige)" },
        { code: "da-DK", label: "Dansk (Danmark)" },
        { code: "fi-FI", label: "Suomi (Suomi)" },
        { code: "no-NO", label: "Norsk (Norge)" },
        { code: "tr-TR", label: "Türkçe (Türkiye)" },
        { code: "he-IL", label: "עברית (ישראל)" },
        { code: "ar-SA", label: "العربية (المملكة العربية السعودية)" },
        { code: "ar-EG", label: "العربية (مصر)" },
        { code: "ja-JP", label: "日本語 (日本)" },
        { code: "ko-KR", label: "한국어 (대한민국)" },
        { code: "zh-CN", label: "中文 (简体)" },
        { code: "zh-TW", label: "中文 (繁體)" },
        { code: "zh-HK", label: "中文 (香港)" },
        { code: "hi-IN", label: "हिन्दी (भारत)" },
        { code: "id-ID", label: "Bahasa Indonesia (Indonesia)" },
        { code: "ms-MY", label: "Bahasa Melayu (Malaysia)" },
        { code: "th-TH", label: "ภาษาไทย (ประเทศไทย)" },
        { code: "vi-VN", label: "Tiếng Việt (Việt Nam)" },
    ];

    get filteredLocales() {
        const q = this.localeSearch.toLowerCase();
        if (!q) return this.localeOptions;
        return this.localeOptions.filter(
            o => o.code.toLowerCase().includes(q) || o.label.toLowerCase().includes(q),
        );
    }

    get currentLocaleLabel(): string {
        return this.localeOptions.find(o => o.code === this.localSettings.locale)?.label ?? "";
    }

    openLocaleDropdown() {
        this.localeSearch = "";
        const rect = this.localeTrigger.nativeElement.getBoundingClientRect();
        const margin = 8;
        const spaceBelow = window.innerHeight - rect.bottom - margin;
        const spaceAbove = rect.top - margin;
        const maxAllowed = 320;

        const style: Record<string, string> = {
            left: `${rect.left}px`,
            width: `${rect.width}px`,
        };

        if (spaceBelow >= 150 || spaceBelow >= spaceAbove) {
            style["top"] = `${rect.bottom + 4}px`;
            style["maxHeight"] = `${Math.min(spaceBelow, maxAllowed)}px`;
        } else {
            style["bottom"] = `${window.innerHeight - rect.top + 4}px`;
            style["maxHeight"] = `${Math.min(spaceAbove, maxAllowed)}px`;
        }

        this.localeDropdownStyle = style;
        this.isLocaleDropdownOpen = true;
    }

    selectLocale(code: string) {
        this.localSettings.setLocale(code);
        this.isLocaleDropdownOpen = false;
    }

    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    async ngOnInit(): Promise<void> {
        await this.userStore.loadCurrent();
    }

    toggleEdit() {
        this.isEditing = !this.isEditing;
    }

    loading = false;
    async saveChanges() {
        if (!this.userStore.currentUser) return;
        this.loading = true;
        try {
            await this.userController.updateCurrentUser(this.userStore.currentUser);
            this.isEditing = false;
            this.userStore.currentUser.password = ""; // Clear password
        } catch (error) {
            this.handleErr("Error updating user.", error);
            return;
        } finally {
            this.loading = false;
        }
    }

    async cancelEdit() {
        this.loading = true;
        this.isEditing = false;
        try {
            await this.userStore.getCurrent(); // Revert changes
        } catch (error) {
            this.handleErr("Error getting current user.", error);
            return;
        } finally {
            this.loading = false;
        }
    }

    // Method to toggle the theme
    toggleTheme(theme: ThemeMode) {
        this.localSettings.setThemeMode(theme);
        this.localSettings.updateTheme(this.renderer);
    }

    toggleMarkAsRead(autoMarkAsRead: boolean) {
        this.localSettings.setAutoMarkAsRead(autoMarkAsRead);
    }

    toggleSendTyping(sendTyping: boolean) {
        this.localSettings.setSendTyping(sendTyping);
    }

    resetLocale() {
        this.localSettings.setLocale(null);
        this.isLocaleDropdownOpen = false;
    }

    get localeDatePreview(): string {
        try {
            return new Date().toLocaleString(this.localSettings.locale, {
                dateStyle: "short",
                timeStyle: "short",
            });
        } catch {
            return "";
        }
    }

    errorStr = "";
    errorData: unknown;
    handleErr(message: string, err: unknown) {
        if (isHttpError(err)) {
            this.errorData = err.response?.data;
            this.errorStr = err.response?.data?.description ?? message;
        } else {
            this.errorData = err;
            this.errorStr = message;
        }

        this.logger.error("Async error", err);
        this.errorModal.openModal();
    }
}
