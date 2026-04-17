import { CommonModule } from "@angular/common";
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
import { WebhookPreviewComponent } from "./webhook-preview/webhook-preview.component";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";
import { WebhookStoreService } from "../../../core/webhook/store/webhook-store.service";
import { SmallButtonComponent } from "../../common/small-button/small-button.component";
import { KeyboardNavigableList } from "../../common/keyboard/keyboard-navigable-list.base";
import { NGXLogger } from "ngx-logger";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-webhook-sidebar",
    imports: [
        CommonModule,
        SmallButtonComponent,
        WebhookPreviewComponent,
        FormsModule,
        MatIconModule,
        RouterModule,
        TimeoutErrorModalComponent,
    ],
    templateUrl: "./webhook-sidebar.component.html",
    styleUrl: "./webhook-sidebar.component.scss",
    standalone: true,
})
export class WebhookSidebarComponent extends KeyboardNavigableList implements OnInit {
    queryParamsService = inject(QueryParamsService);
    webhookStore = inject(WebhookStoreService);
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
        this.webhookStore.searchValue = "";
        const textarea = this.searchTextarea.nativeElement;
        textarea.style.height = "auto";
        textarea.focus();
    }

    async ngOnInit() {
        await this.getWebhooks();
    }

    async getWebhooks(): Promise<void> {
        this.scrolling = true;

        try {
            await this.webhookStore.get();
        } catch (error) {
            this.handleErr("Error getting webhooks", error);
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
            !this.webhookStore.searchValue &&
            !this.webhookStore.reachedMaxLimit
        )
            this.getWebhooks();
        else if (
            this.webhookStore.searchValue &&
            !this.webhookStore.reachedMaxSearchLimit &&
            !this.webhookStore.isExecuting &&
            !this.webhookStore.pendingExecution
        )
            this.getSearchWebhooks();
    }

    async getSearchWebhooks(): Promise<void> {
        this.scrolling = true;

        try {
            await this.webhookStore.getSearch();
        } catch (error) {
            this.handleErr("Error getting search webhooks", error);
        } finally {
            this.scrolling = false;
        }
    }

    async getInitialSearchWebhooks(): Promise<void> {
        this.scrolling = true;

        try {
            await this.webhookStore.getInitialSearch();
        } catch (error) {
            this.handleErr("Error getting initial search webhooks", error);
        } finally {
            this.scrolling = false;
        }
    }

    async addMessagingProductContactIdField(messagingProductContactId: string) {
        await this.webhookStore.addFilter({
            text: `Messaging product contact id ${messagingProductContactId}`,
        });
    }

    @ViewChildren(WebhookPreviewComponent, { read: ElementRef })
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
