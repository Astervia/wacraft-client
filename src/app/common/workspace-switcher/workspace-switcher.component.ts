import { CommonModule } from "@angular/common";
import { Component, ElementRef, HostListener, inject, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatIconModule } from "@angular/material/icon";
import { WorkspaceStoreService } from "../../../core/workspace/store/workspace-store.service";
import { WorkspaceControllerService } from "../../../core/workspace/controller/workspace-controller.service";
import { Workspace } from "../../../core/workspace/entity/workspace.entity";

@Component({
    selector: "app-workspace-switcher",
    imports: [CommonModule, FormsModule, MatTooltipModule, MatIconModule],
    templateUrl: "./workspace-switcher.component.html",
    styleUrl: "./workspace-switcher.component.scss",
    standalone: true,
})
export class WorkspaceSwitcherComponent {
    workspaceStore = inject(WorkspaceStoreService);
    private workspaceController = inject(WorkspaceControllerService);
    private elementRef = inject(ElementRef);

    @ViewChild("triggerBtn", { static: false }) triggerBtn!: ElementRef<HTMLButtonElement>;

    isOpen = false;
    showCreateForm = false;
    newWorkspaceName = "";
    newWorkspaceSlug = "";
    isCreating = false;
    dropdownStyle: Record<string, string> = {};
    private scrolling = false;

    @HostListener("document:click", ["$event"])
    private onDocumentClick(event: MouseEvent): void {
        if (!this.elementRef.nativeElement.contains(event.target)) this.close();
    }

    toggle(): void {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.updateDropdownPosition();
        }
        if (!this.isOpen) {
            this.showCreateForm = false;
        }
    }

    private updateDropdownPosition(): void {
        if (!this.triggerBtn) return;
        const rect = this.triggerBtn.nativeElement.getBoundingClientRect();
        this.dropdownStyle = {
            position: "fixed",
            left: rect.right + 8 + "px",
            bottom: window.innerHeight - rect.bottom + "px",
        };
    }

    close(): void {
        this.isOpen = false;
        this.showCreateForm = false;
    }

    selectWorkspace(workspace: Workspace): void {
        this.workspaceStore.setCurrentWorkspace(workspace);
        this.close();
    }

    onScroll(event: Event): void {
        const el = event.target as HTMLElement;
        if (el.scrollHeight - el.scrollTop > el.clientHeight + 100) return;
        if (this.scrolling || this.workspaceStore.reachedMaxLimit) return;
        this.loadMore();
    }

    async loadMore(): Promise<void> {
        this.scrolling = true;
        try {
            await this.workspaceStore.get();
        } finally {
            this.scrolling = false;
        }
    }

    async createWorkspace(): Promise<void> {
        if (!this.newWorkspaceName.trim()) return;
        this.isCreating = true;
        try {
            const workspace = await this.workspaceController.create({
                name: this.newWorkspaceName.trim(),
                slug:
                    this.newWorkspaceSlug.trim() ||
                    this.newWorkspaceName.trim().toLowerCase().replace(/\s+/g, "-"),
            });
            await this.workspaceStore.loadWorkspaces();
            this.workspaceStore.setCurrentWorkspace(workspace);
            this.newWorkspaceName = "";
            this.newWorkspaceSlug = "";
            this.showCreateForm = false;
            this.close();
        } finally {
            this.isCreating = false;
        }
    }
}
