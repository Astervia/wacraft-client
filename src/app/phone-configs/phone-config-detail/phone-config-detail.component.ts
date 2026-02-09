import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { SidebarLayoutComponent } from "../../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../../app.routes";
import { PhoneConfigStoreService } from "../../../core/phone-config/store/phone-config-store.service";
import { PhoneConfigControllerService } from "../../../core/phone-config/controller/phone-config-controller.service";
import { WorkspaceStoreService } from "../../../core/workspace/store/workspace-store.service";
import { PhoneConfig } from "../../../core/phone-config/entity/phone-config.entity";
import { PhoneConfigFormComponent } from "../phone-config-form/phone-config-form.component";
import { PhoneConfigRegistrationComponent } from "../phone-config-registration/phone-config-registration.component";
import { CreatePhoneConfig, UpdatePhoneConfig } from "../../../core/phone-config/model/create.model";
import { environment } from "../../../environments/environment";

@Component({
    selector: "app-phone-config-detail",
    imports: [
        CommonModule,
        SidebarLayoutComponent,
        PhoneConfigFormComponent,
        PhoneConfigRegistrationComponent,
    ],
    templateUrl: "./phone-config-detail.component.html",
    standalone: true,
})
export class PhoneConfigDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private phoneConfigStore = inject(PhoneConfigStoreService);
    private phoneConfigController = inject(PhoneConfigControllerService);
    workspaceStore = inject(WorkspaceStoreService);

    RoutePath = RoutePath;

    config: PhoneConfig | null = null;
    isCreateMode = false;
    isEditing = false;
    loading = false;
    errorMessage = "";

    copiedField: string | null = null;

    async ngOnInit(): Promise<void> {
        const id = this.route.snapshot.paramMap.get("id");
        if (!id) {
            this.isCreateMode = true;
            return;
        }

        this.loading = true;
        try {
            const config = await this.phoneConfigStore.getById(id);
            if (config) {
                this.config = config;
            } else {
                this.errorMessage = "Phone config not found.";
            }
        } catch {
            this.errorMessage = "Failed to load phone config.";
        } finally {
            this.loading = false;
        }
    }

    navigateBack(): void {
        this.router.navigate(["/" + RoutePath.phoneConfigs]);
    }

    startEdit(): void {
        this.isEditing = true;
    }

    cancelEdit(): void {
        this.isEditing = false;
    }

    async onSave(data: CreatePhoneConfig | UpdatePhoneConfig): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        this.errorMessage = "";

        try {
            if (this.isCreateMode) {
                const created = await this.phoneConfigController.create(
                    ws.id,
                    data as CreatePhoneConfig,
                );
                this.phoneConfigStore.add([created]);
                this.router.navigate(["/" + RoutePath.phoneConfigs, created.id]);
            } else if (this.config) {
                const updated = await this.phoneConfigController.update(
                    ws.id,
                    this.config.id,
                    data,
                );
                this.config = updated;
                this.phoneConfigStore.phoneConfigsById.set(updated.id, updated);
                this.isEditing = false;
            }
        } catch {
            this.errorMessage = this.isCreateMode
                ? "Failed to create phone config."
                : "Failed to update phone config.";
        }
    }

    async deleteConfig(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws || !this.config) return;
        if (!confirm(`Delete phone config "${this.config.name}"?`)) return;
        try {
            await this.phoneConfigController.delete(ws.id, this.config.id);
            await this.phoneConfigStore.load();
            this.navigateBack();
        } catch {
            this.errorMessage = "Failed to delete phone config.";
        }
    }

    getWebhookUrl(): string {
        if (!this.config) return "";
        const protocol = environment.mainServerSecurity ? "https" : "http";
        return `${protocol}://${environment.mainServerUrl}/webhook-in/${this.config.waba_id}`;
    }

    async copyToClipboard(value: string, field: string): Promise<void> {
        await navigator.clipboard.writeText(value);
        this.copiedField = field;
        setTimeout(() => {
            if (this.copiedField === field) {
                this.copiedField = null;
            }
        }, 2000);
    }
}
