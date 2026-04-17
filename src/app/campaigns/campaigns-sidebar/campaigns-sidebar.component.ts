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
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { SmallButtonComponent } from "../../common/small-button/small-button.component";
import { CampaignPreviewComponent } from "./campaign-preview/campaign-preview.component";
import { CampaignStoreService } from "../../../core/campaign/store/campaign-store.service";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";
import { KeyboardNavigableList } from "../../common/keyboard/keyboard-navigable-list.base";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { NGXLogger } from "ngx-logger";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-campaigns-sidebar",
    imports: [
        SmallButtonComponent,
        FormsModule,
        CampaignPreviewComponent,
        CommonModule,
        MatIconModule,
        RouterModule,
        TimeoutErrorModalComponent,
    ],
    templateUrl: "./campaigns-sidebar.component.html",
    styleUrl: "./campaigns-sidebar.component.scss",
    standalone: true,
})
export class CampaignsSidebarComponent extends KeyboardNavigableList implements OnInit {
    queryParamsService = inject(QueryParamsService);
    campaignStore = inject(CampaignStoreService);
    private logger = inject(NGXLogger);

    private scrolling = false;

    constructor() {
        super();
    }

    @ViewChild("searchTextarea")
    searchTextarea!: ElementRef<HTMLTextAreaElement>;

    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    adjustHeight(event: Event): void {
        const element = event.target as HTMLElement;
        if (!element) return;
        element.style.height = "auto"; // Reset height to auto to get the correct scrollHeight
        element.style.height = `${element.scrollHeight}px`; // Set height to scrollHeight
    }

    clearSearch(): void {
        this.campaignStore.searchValue = "";
        const textarea = this.searchTextarea.nativeElement;
        textarea.style.height = "auto";
        textarea.focus();
    }

    async ngOnInit() {
        await this.getCampaigns();
    }

    async getCampaigns(): Promise<void> {
        this.scrolling = true;

        try {
            await this.campaignStore.get();
        } catch (error) {
            this.handleErr("Error getting campaigns", error);
        } finally {
            this.scrolling = false;
        }
    }

    onScroll(event: Event) {
        const element = event.target as HTMLElement;
        if (
            // Check if the user has scrolled to the bottom of the element
            !(
                element.scrollHeight - element.scrollTop <= element.clientHeight + 100 &&
                // Check if some request is being performed
                !this.scrolling
            )
        )
            return;

        if (
            // Check if user is not searching
            !this.campaignStore.searchValue &&
            !this.campaignStore.reachedMaxLimit
        )
            this.getCampaigns();
        else if (
            this.campaignStore.searchValue &&
            !this.campaignStore.reachedMaxSearchLimit &&
            !this.campaignStore.isExecuting &&
            !this.campaignStore.pendingExecution
        )
            this.getSearchCampaigns();
    }

    async getSearchCampaigns(): Promise<void> {
        this.scrolling = true;

        try {
            await this.campaignStore.getSearch();
        } catch (error) {
            this.handleErr("Error getting initial search campaigns", error);
        } finally {
            this.scrolling = false;
        }
    }

    async getInitialSearchCampaigns(): Promise<void> {
        this.scrolling = true;

        try {
            await this.campaignStore.getInitialSearch();
        } catch (error) {
            this.handleErr("Error getting initial search campaigns", error);
        } finally {
            this.scrolling = false;
        }
    }

    async addMessagingProductContactIdField(messagingProductContactId: string) {
        await this.campaignStore.addFilter({
            text: `Messaging product contact id ${messagingProductContactId}`,
        });
    }

    @ViewChildren(CampaignPreviewComponent, { read: ElementRef })
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
}
