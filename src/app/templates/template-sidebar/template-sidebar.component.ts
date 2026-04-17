import {
    Component,
    ElementRef,
    HostListener,
    OnInit,
    QueryList,
    ViewChild,
    ViewChildren,
    inject,
} from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { TemplatePreviewComponent } from "../template-preview/template-preview.component";
import { CommonModule } from "@angular/common";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";
import { TemplateStoreService } from "../../../core/template/store/template-store.service";
import { MatIconModule } from "@angular/material/icon";
import { KeyboardNavigableList } from "../../common/keyboard/keyboard-navigable-list.base";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { NGXLogger } from "ngx-logger";
import { TemplateCategory, TemplateStatus } from "../../../core/template/model/template.model";
import { TemplateQualityScore } from "../../../core/template/model/template-query-params.model";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-template-sidebar",
    imports: [
        FormsModule,
        TemplatePreviewComponent,
        CommonModule,
        MatIconModule,
        TimeoutErrorModalComponent,
    ],
    templateUrl: "./template-sidebar.component.html",
    styleUrl: "./template-sidebar.component.scss",
    standalone: true,
})
export class TemplateSidebarComponent extends KeyboardNavigableList implements OnInit {
    private router = inject(Router);
    templateStore = inject(TemplateStoreService);
    queryParamsService = inject(QueryParamsService);
    private logger = inject(NGXLogger);

    private scrolling = false;

    constructor() {
        super();
    }

    @ViewChild("searchTextarea")
    searchTextarea!: ElementRef<HTMLTextAreaElement>;

    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    // Expose enums to template
    TemplateStatus = TemplateStatus;
    TemplateCategory = TemplateCategory;
    TemplateQualityScore = TemplateQualityScore;

    // Get enum values as arrays
    statusOptions = Object.values(TemplateStatus);
    categoryOptions = Object.values(TemplateCategory);
    qualityScoreOptions = Object.values(TemplateQualityScore);

    // Track expanded state for filter sections
    filtersExpanded = {
        status: false,
        category: false,
        qualityScore: false,
    };

    // Track if advanced filters section is visible
    showAdvancedFilters = false;

    adjustHeight(event: Event): void {
        const element = event.target as HTMLElement;
        if (!element) return;
        element.style.height = "auto"; // Reset height to auto to get the correct scrollHeight
        element.style.height = `${element.scrollHeight}px`; // Set height to scrollHeight
    }

    clearSearch(): void {
        this.templateStore.searchValue = "";
        const textarea = this.searchTextarea.nativeElement;
        textarea.style.height = "auto";
        textarea.focus();
    }

    async ngOnInit() {
        await this.getTemplates();
    }

    async getTemplates(): Promise<void> {
        this.scrolling = true;

        try {
            await this.templateStore.get();
        } catch (error) {
            this.handleErr("Error getting templates", error);
            return;
        } finally {
            this.scrolling = false;
        }
    }

    onScroll(event: Event) {
        const element = event.target as HTMLElement;
        if (
            // Check if the template has scrolled to the bottom of the element
            !(
                element.scrollHeight - element.scrollTop <= element.clientHeight + 100 &&
                // Check if some request is being performed
                !this.scrolling
            )
        )
            return;

        if (
            // Check if not in search mode (no filters and no search text)
            !this.isSearchMode()
        )
            this.getTemplates();
        else if (
            this.isSearchMode() &&
            !this.templateStore.isExecuting &&
            !this.templateStore.pendingExecution
        )
            this.getSearchTemplates();
    }

    async getSearchTemplates(): Promise<void> {
        this.scrolling = true;

        try {
            await this.templateStore.getSearchTemplates();
        } catch (error) {
            this.handleErr("Error getting search templates", error);
            return;
        } finally {
            this.scrolling = false;
        }
    }

    async getInitialSearchTemplates(): Promise<void> {
        this.scrolling = true;

        try {
            await this.templateStore.getInitialSearchTemplates();
        } catch (error) {
            this.handleErr("Error getting initial search templates", error);
            return;
        } finally {
            this.scrolling = false;
        }
    }

    async addMessagingProductContactIdField(messagingProductContactId: string) {
        try {
            await this.templateStore.addFilter({
                text: `Messaging product contact id ${messagingProductContactId}`,
            });
        } catch (error) {
            this.handleErr("Error adding messaging product contact id", error);
            return;
        }
    }

    resetTemplateId() {
        this.router.navigate([], {
            queryParams: this.queryParamsService.globalQueryParams,
            preserveFragment: true,
            queryParamsHandling: "replace",
        });
    }

    @ViewChildren(TemplatePreviewComponent, { read: ElementRef })
    protected rows!: QueryList<ElementRef<HTMLElement>>;

    protected onEnter(i: number) {
        this.rows.toArray()[i].nativeElement.click();
    }

    @ViewChild("draggableContainer")
    draggableContainer!: ElementRef<HTMLElement>;
    isResizing = false;
    sidebarWidth = 400;
    @HostListener("window:mousemove", ["$event"])
    private onMouseMove(event: MouseEvent) {
        if (!this.isResizing) return;
        if (!this.queryParamsService.sidebarOpen) this.queryParamsService.openSidebar();

        const newWidth = event.clientX - this.draggableContainer.nativeElement.offsetLeft;
        this.sidebarWidth = newWidth;

        if (newWidth <= 10) this.queryParamsService.closeSidebar();

        event.preventDefault();
    }

    @HostListener("window:mouseup")
    private onMouseUp() {
        this.isResizing = false;
    }

    @HostListener("window:keydown.control.shift.f", ["$event"])
    private onControlShiftF(event: KeyboardEvent) {
        event.preventDefault();
        this.searchTextarea.nativeElement.focus();
    }

    startResizing(event: MouseEvent) {
        this.isResizing = true;
        event.preventDefault(); // Prevent text selection
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

    toggleFilterSection(section: "status" | "category" | "qualityScore") {
        this.filtersExpanded[section] = !this.filtersExpanded[section];
    }

    formatEnumValue(value: string): string {
        return value
            .toLowerCase()
            .split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    getActiveFilterCount(): number {
        return (
            this.templateStore.selectedStatuses.size +
            this.templateStore.selectedCategories.size +
            this.templateStore.selectedQualityScores.size
        );
    }

    isSearchMode(): boolean {
        return this.templateStore.hasActiveFilters();
    }
}
