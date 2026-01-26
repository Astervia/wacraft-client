import { Component, OnInit, Renderer2, ViewChild, inject } from "@angular/core";
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
import { RoutePath } from "../app.routes";
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
