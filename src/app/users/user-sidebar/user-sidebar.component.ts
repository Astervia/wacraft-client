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
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SmallButtonComponent } from "../../common/small-button/small-button.component";
import { UserPreviewComponent } from "../user-preview/user-preview.component";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";
import { UserStoreService } from "../../../core/user/store/user-store.service";
import { MatIconModule } from "@angular/material/icon";
import { KeyboardNavigableList } from "../../common/keyboard/keyboard-navigable-list.base";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { NGXLogger } from "ngx-logger";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-user-sidebar",
    imports: [
        CommonModule,
        FormsModule,
        SmallButtonComponent,
        UserPreviewComponent,
        MatIconModule,
        RouterModule,
        TimeoutErrorModalComponent,
    ],
    templateUrl: "./user-sidebar.component.html",
    styleUrl: "./user-sidebar.component.scss",
    standalone: true,
})
export class UserSidebarComponent extends KeyboardNavigableList implements OnInit {
    queryParamsService = inject(QueryParamsService);
    userStore = inject(UserStoreService);
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
        this.userStore.searchValue = "";
        const textarea = this.searchTextarea.nativeElement;
        textarea.style.height = "auto";
        textarea.focus();
    }

    async ngOnInit() {
        await this.getUsers();
    }

    async getUsers(): Promise<void> {
        this.scrolling = true;

        try {
            await this.userStore.get();
        } catch (error) {
            this.handleErr("Error getting users", error);
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
            !this.userStore.searchValue &&
            !this.userStore.reachedMaxLimit
        )
            this.getUsers();
        else if (
            this.userStore.searchValue &&
            !this.userStore.reachedMaxSearchLimit &&
            !this.userStore.isExecuting &&
            !this.userStore.pendingExecution
        )
            this.getSearchUsers();
    }

    async getSearchUsers(): Promise<void> {
        this.scrolling = true;

        try {
            await this.userStore.getSearch();
        } catch (error) {
            this.handleErr("Error getting search users", error);
        } finally {
            this.scrolling = false;
        }
    }

    async getInitialSearchUsers(): Promise<void> {
        this.scrolling = true;

        await this.userStore.getInitialSearch();

        this.scrolling = false;
    }

    async addMessagingProductContactIdField(messagingProductContactId: string) {
        await this.userStore.addFilter({
            text: `Messaging product contact id ${messagingProductContactId}`,
        });
    }

    @ViewChildren(UserPreviewComponent, { read: ElementRef })
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
