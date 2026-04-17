import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    OnInit,
    Output,
    ViewChild,
    inject,
} from "@angular/core";
import { ConversationMessagingProductContact } from "../../../core/message/model/conversation.model";
import { ActivatedRoute, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MessagingProductContactFromMessagePipe } from "../../../core/message/pipe/messaging-product-contact-from-message.pipe";
import { ConversationPreviewComponent } from "./conversation-preview/conversation-preview.component";
import { MatIconModule } from "@angular/material/icon";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";
import { ConversationStoreService } from "../../../core/message/store/conversation-store.service";
import { NGXLogger } from "ngx-logger";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-contacts-modal",
    imports: [
        CommonModule,
        FormsModule,
        ConversationPreviewComponent,
        MessagingProductContactFromMessagePipe,
        MatIconModule,
        TimeoutErrorModalComponent,
    ],
    templateUrl: "./contacts-modal.component.html",
    styleUrl: "./contacts-modal.component.scss",
    standalone: true,
})
export class ContactsModalComponent implements OnInit {
    private queryParamsService = inject(QueryParamsService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    conversationStore = inject(ConversationStoreService);
    private logger = inject(NGXLogger);

    private scrolling = false;

    @ViewChild("searchTextarea")
    searchTextarea!: ElementRef<HTMLTextAreaElement>;

    @Input() headerText!: string;
    @Input() bottomText!: string;
    @Output() send = new EventEmitter<ConversationMessagingProductContact[]>();
    @Output() close = new EventEmitter();

    selectedConversations: ConversationMessagingProductContact[] = [];
    messagingProductContactIdFilter?: string;

    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    adjustHeight(event: Event): void {
        const element = event.target as HTMLElement;
        if (!element) return;
        element.style.height = "auto"; // Reset height to auto to get the correct scrollHeight
        element.style.height = `${element.scrollHeight}px`; // Set height to scrollHeight
    }

    clearSearch(shouldFocus = true): void {
        this.conversationStore.searchValue = "";
        const textarea = this.searchTextarea.nativeElement;
        textarea.style.height = "auto";
        if (shouldFocus) textarea.focus();
    }

    async ngOnInit() {
        this.conversationStore.initConditionally(this.route);
        this.watchQueryParams();
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
            this.handleErr("Error getting search conversations", error);
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

    watchQueryParams() {
        this.route.queryParams.subscribe(async params => {
            const messagingProductContactId = params["messaging_product_contact.id"];
            if (!messagingProductContactId) return;
            this.conversationStore.read(messagingProductContactId);
        });
    }

    addChat() {
        this.router.navigate([], {
            queryParams: {
                mode: "new_contact",
                ...this.queryParamsService.globalQueryParams,
            },
            queryParamsHandling: "replace",
            preserveFragment: true,
        });
    }

    selectConversation(conversation: ConversationMessagingProductContact) {
        this.selectedConversations.push(conversation);
    }

    unselectConversation(conversation: ConversationMessagingProductContact) {
        this.selectedConversations = this.selectedConversations.filter(
            selectedConversation => selectedConversation.id !== conversation.id,
        );
    }

    isConversationSelected(conversation: ConversationMessagingProductContact) {
        return this.selectedConversations.some(
            selectedConversation => selectedConversation.id === conversation.id,
        );
    }

    sendToContacts() {
        this.clearSearch(false);
        this.send.emit(this.selectedConversations);
        this.selectedConversations = [];
        this.close.emit();
    }

    closeModal() {
        this.clearSearch(false);
        this.selectedConversations = [];
        this.close.emit();
    }

    /**
     * Listens for the keyboard shortcut Shift + Esc at the window level
     * and closes the modal when pressed.
     * The default browser behavior for this key combination is prevented.
     */
    @HostListener("window:keydown.shift.escape", ["$event"])
    private closeOnShiftEscape(event: KeyboardEvent) {
        event.preventDefault();
        this.closeModal();
    }

    @HostListener("window:keydown.control.shift.f", ["$event"])
    private onControlShiftF(event: KeyboardEvent) {
        event.preventDefault();
        this.searchTextarea.nativeElement.focus();
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
