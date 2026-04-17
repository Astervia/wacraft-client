import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    OnInit,
    Output,
    QueryList,
    ViewChild,
    ViewChildren,
    inject,
} from "@angular/core";
import { ConversationMessagingProductContact } from "../../core/message/model/conversation.model";
import { CommonModule } from "@angular/common";
import { MessagingProductContactFromMessagePipe } from "../../core/message/pipe/messaging-product-contact-from-message.pipe";
import { MessageModule } from "../../core/message/message.module";
import { ConversationPreviewComponent } from "./conversation-preview/conversation-preview.component";
import { SmallButtonComponent } from "../common/small-button/small-button.component";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { QueryParamsService } from "../../core/navigation/service/query-params.service";
import { ConversationStoreService } from "../../core/message/store/conversation-store.service";
import { MatIconModule } from "@angular/material/icon";
import { KeyboardNavigableList } from "../common/keyboard/keyboard-navigable-list.base";
import { NGXLogger } from "ngx-logger";
import { TimeoutErrorModalComponent } from "../common/timeout-error-modal/timeout-error-modal.component";
import { isHttpError } from "../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-chats-sidebar",
    imports: [
        CommonModule,
        MessageModule,
        FormsModule,
        MessagingProductContactFromMessagePipe,
        MessagingProductContactFromMessagePipe,
        ConversationPreviewComponent,
        SmallButtonComponent,
        MatIconModule,
        RouterModule,
    ],
    templateUrl: "./chats-sidebar.component.html",
    styleUrl: "./chats-sidebar.component.scss",
    standalone: true,
})
export class ChatsSidebarComponent extends KeyboardNavigableList implements OnInit {
    private route = inject(ActivatedRoute);
    queryParamsService = inject(QueryParamsService);
    conversationStore = inject(ConversationStoreService);
    private logger = inject(NGXLogger);

    private scrolling = false;

    constructor() {
        super();
    }

    @ViewChild("searchTextarea")
    searchTextarea!: ElementRef<HTMLTextAreaElement>;

    @Output() selectMessagingProductContact =
        new EventEmitter<ConversationMessagingProductContact>();

    messagingProductContactIdFilter?: string;

    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    ngOnInit() {
        this.conversationStore.initConditionally(this.route);
        this.watchQueryParams();
    }

    adjustHeight(event: Event): void {
        const element = event.target as HTMLElement;
        if (!element) return;
        element.style.height = "auto"; // Reset height to auto to get the correct scrollHeight
        element.style.height = `${element.scrollHeight}px`; // Set height to scrollHeight
    }

    clearSearch(): void {
        this.conversationStore.searchValue = "";
        const textarea = this.searchTextarea.nativeElement;
        textarea.style.height = "auto";
        textarea.focus();
    }

    async getConversations(): Promise<void> {
        this.scrolling = true;

        try {
            await this.conversationStore.get();
        } catch (error) {
            this.handleErr("Error getting conversations", error);
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
            !this.conversationStore.searchValue &&
            !this.messagingProductContactIdFilter &&
            !this.conversationStore.reachedMaxConversationLimit
        )
            this.getConversations();
        else if (
            (this.conversationStore.searchValue || this.messagingProductContactIdFilter) &&
            !this.conversationStore.reachedMaxSearchConversationLimit &&
            !this.conversationStore.isExecuting &&
            !this.conversationStore.pendingExecution
        )
            this.getSearchConversations();
    }

    async getSearchConversations(): Promise<void> {
        this.scrolling = true;

        try {
            await this.conversationStore.getSearchConversations();
        } catch (error) {
            this.handleErr("Error getting search convversations", error);
        } finally {
            this.scrolling = false;
        }
    }

    async getInitialSearchConversations(): Promise<void> {
        this.scrolling = true;

        try {
            await this.conversationStore.getInitialSearch();
        } catch (error) {
            this.handleErr("Error getting initial search conversations", error);
        } finally {
            this.scrolling = false;
        }
    }

    async addMessagingProductContactIdField(messagingProductContactId: string) {
        try {
            await this.conversationStore.addFilter(
                {
                    text: `Messaging product contact id ${messagingProductContactId}`,
                },
                messagingProductContactId,
            );
        } catch (error) {
            this.handleErr("Error adding filter", error);
        }
    }

    // Handle message read.
    watchQueryParams() {
        this.route.queryParams.subscribe(async params => {
            const messagingProductContactId = params["messaging_product_contact.id"];
            if (!messagingProductContactId) return;
            this.conversationStore.read(messagingProductContactId);
        });
    }

    get addChatQueryParams() {
        return {
            mode: "new_contact",
            ...this.queryParamsService.globalQueryParams,
        };
    }

    @ViewChildren(ConversationPreviewComponent, { read: ElementRef })
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
