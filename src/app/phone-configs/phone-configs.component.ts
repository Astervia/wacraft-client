import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../app.routes";
import { PhoneConfigStoreService } from "../../core/phone-config/store/phone-config-store.service";
import { PhoneConfigControllerService } from "../../core/phone-config/controller/phone-config-controller.service";
import { WorkspaceStoreService } from "../../core/workspace/store/workspace-store.service";
import { PhoneConfig } from "../../core/phone-config/entity/phone-config.entity";
import { PhoneConfigFormComponent } from "./phone-config-form/phone-config-form.component";
import { CreatePhoneConfig, UpdatePhoneConfig } from "../../core/phone-config/model/create.model";
import { environment } from "../../environments/environment";

@Component({
    selector: "app-phone-configs",
    imports: [CommonModule, SidebarLayoutComponent, PhoneConfigFormComponent],
    templateUrl: "./phone-configs.component.html",
    standalone: true,
})
export class PhoneConfigsComponent implements OnInit {
    phoneConfigStore = inject(PhoneConfigStoreService);
    private phoneConfigController = inject(PhoneConfigControllerService);
    workspaceStore = inject(WorkspaceStoreService);

    RoutePath = RoutePath;

    showForm = false;
    editingConfig: PhoneConfig | null = null;
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

        if (!this.phoneConfigStore.reachedMaxLimit && !this.phoneConfigStore.loading) this.getMore();
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

    openCreateForm(): void {
        this.editingConfig = null;
        this.showForm = true;
    }

    openEditForm(config: PhoneConfig): void {
        this.editingConfig = config;
        this.showForm = true;
    }

    closeForm(): void {
        this.showForm = false;
        this.editingConfig = null;
    }

    async onSave(data: CreatePhoneConfig | UpdatePhoneConfig): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        this.errorMessage = "";
        try {
            if (this.editingConfig) {
                await this.phoneConfigController.update(ws.id, this.editingConfig.id, data);
            } else {
                await this.phoneConfigController.create(ws.id, data as CreatePhoneConfig);
            }
            this.closeForm();
            await this.phoneConfigStore.load();
        } catch {
            this.errorMessage = "Failed to save phone config.";
        }
    }

    copiedField: { configId: string; field: string } | null = null;
    expandedWebhook = new Set<string>();

    toggleWebhookInfo(configId: string): void {
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

    async copyToClipboard(value: string, configId: string, field: string): Promise<void> {
        await navigator.clipboard.writeText(value);
        this.copiedField = { configId, field };
        setTimeout(() => {
            if (this.copiedField?.configId === configId && this.copiedField?.field === field) {
                this.copiedField = null;
            }
        }, 2000);
    }

    async deleteConfig(config: PhoneConfig): Promise<void> {
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
