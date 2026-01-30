import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../app.routes";
import { WorkspaceStoreService } from "../../core/workspace/store/workspace-store.service";
import { WorkspaceControllerService } from "../../core/workspace/controller/workspace-controller.service";

@Component({
    selector: "app-workspace-settings",
    imports: [CommonModule, FormsModule, SidebarLayoutComponent],
    templateUrl: "./workspace-settings.component.html",
    standalone: true,
})
export class WorkspaceSettingsComponent implements OnInit {
    workspaceStore = inject(WorkspaceStoreService);
    private workspaceController = inject(WorkspaceControllerService);

    RoutePath = RoutePath;

    isEditing = false;
    loading = false;
    errorMessage = "";

    editData = { name: "", slug: "", description: "" };

    ngOnInit(): void {
        this.resetEditData();
    }

    resetEditData(): void {
        const ws = this.workspaceStore.currentWorkspace;
        if (ws) {
            this.editData = {
                name: ws.name,
                slug: ws.slug,
                description: ws.description || "",
            };
        }
    }

    toggleEdit(): void {
        this.isEditing = !this.isEditing;
        if (this.isEditing) this.resetEditData();
    }

    async save(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        this.loading = true;
        this.errorMessage = "";
        try {
            const updated = await this.workspaceController.update(ws.id, this.editData);
            Object.assign(ws, updated);
            this.isEditing = false;
        } catch {
            this.errorMessage = "Failed to update workspace settings.";
        } finally {
            this.loading = false;
        }
    }

    cancel(): void {
        this.isEditing = false;
        this.resetEditData();
    }

    async deleteWorkspace(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        if (!confirm(`Are you sure you want to delete workspace "${ws.name}"?`)) return;
        this.loading = true;
        try {
            await this.workspaceController.delete(ws.id);
            await this.workspaceStore.loadWorkspaces();
            this.workspaceStore.restoreWorkspace();
        } catch {
            this.errorMessage = "Failed to delete workspace.";
        } finally {
            this.loading = false;
        }
    }
}
