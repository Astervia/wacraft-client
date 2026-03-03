import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../app.routes";
import { PhoneConfigStoreService } from "../../core/phone-config/store/phone-config-store.service";
import { PhoneConfigControllerService } from "../../core/phone-config/controller/phone-config-controller.service";
import { WorkspaceStoreService } from "../../core/workspace/store/workspace-store.service";
import { PhoneConfig } from "../../core/phone-config/entity/phone-config.entity";
import { environment } from "../../environments/environment";
import { CopyButtonComponent } from "../common/copy-button/copy-button.component";

@Component({
    selector: "app-phone-configs",
    imports: [CommonModule, SidebarLayoutComponent, CopyButtonComponent],
    templateUrl: "./phone-configs.component.html",
    standalone: true,
})
export class PhoneConfigsComponent implements OnInit {
    phoneConfigStore = inject(PhoneConfigStoreService);
    private phoneConfigController = inject(PhoneConfigControllerService);
    workspaceStore = inject(WorkspaceStoreService);
    private router = inject(Router);

    RoutePath = RoutePath;
    errorMessage = "";

    private scrolling = false;

    async ngOnInit(): Promise<void> {
        await this.phoneConfigStore.load();
    }

    onScroll(event: Event) {
        const element = event.target as HTMLElement;
        if (
            !(
                element.scrollHeight - element.scrollTop <= element.clientHeight + 100 &&
                !this.scrolling
            )
        )
            return;

        if (!this.phoneConfigStore.reachedMaxLimit && !this.phoneConfigStore.loading)
            this.getMore();
    }

    async getMore(): Promise<void> {
        this.scrolling = true;
        try {
            await this.phoneConfigStore.get();
        } catch {
            this.errorMessage = "Failed to load more phone configs.";
        } finally {
            this.scrolling = false;
        }
    }

    navigateToDetail(config: PhoneConfig): void {
        this.router.navigate(["/" + RoutePath.phoneConfigs, config.id]);
    }

    navigateToCreate(): void {
        this.router.navigate(["/" + RoutePath.phoneConfigNew]);
    }

    expandedWebhook = new Set<string>();

    toggleWebhookInfo(event: Event, configId: string): void {
        event.stopPropagation();
        if (this.expandedWebhook.has(configId)) {
            this.expandedWebhook.delete(configId);
        } else {
            this.expandedWebhook.add(configId);
        }
    }

    getWebhookUrl(config: PhoneConfig): string {
        const protocol = environment.mainServerSecurity ? "https" : "http";
        return `${protocol}://${environment.mainServerUrl}/webhook-in/${config.waba_id}`;
    }

    async deleteConfig(event: Event, config: PhoneConfig): Promise<void> {
        event.stopPropagation();
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        if (!confirm(`Delete phone config "${config.name}"?`)) return;
        try {
            await this.phoneConfigController.delete(ws.id, config.id);
            await this.phoneConfigStore.load();
        } catch {
            this.errorMessage = "Failed to delete phone config.";
        }
    }
}
