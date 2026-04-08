import { CommonModule } from "@angular/common";
import {
    Component,
    ElementRef,
    EventEmitter,
    HostBinding,
    HostListener,
    Input,
    OnInit,
    Output,
    ViewChild,
    inject,
} from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { ActivatedRoute, RouterModule } from "@angular/router";
import {
    Conversation,
    ConversationMessagingProductContact,
} from "../../../core/message/model/conversation.model";
import { MessageDataPipe } from "../../../core/message/pipe/message-data.pipe";
import { MessageContentPreviewComponent } from "../../messages/message-content-preview/message-content-preview.component";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";
import {
    STATUS_ICON_REPOSITORY,
    IMessageStatusIcon,
} from "../../common/repository/status-icon.repository";

@Component({
    selector: "app-conversation-preview",
    standalone: true,
    imports: [CommonModule, MessageContentPreviewComponent, MessageDataPipe, RouterModule],
    templateUrl: "./conversation-preview.component.html",
    styleUrl: "./conversation-preview.component.scss",
})
export class ConversationPreviewComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private queryParamsService = inject(QueryParamsService);
    private sanitizer = inject(DomSanitizer);

    /* ---------------- inputs & outputs ---------------- */
    @Input() messagingProductContact!: ConversationMessagingProductContact;
    @Input() messageId?: string;
    @Input() lastMessage!: Conversation;
    @Input() date!: Date;
    @Input() unread = 0;

    @Output() select = new EventEmitter<ConversationMessagingProductContact>();

    isSelected = false;
    private sanitizedIconCache: Record<string, SafeHtml> = {};

    protected getStatusIcon(
        lastMessage: Conversation,
    ): (IMessageStatusIcon & { safeSvg?: SafeHtml }) | null {
        const status = lastMessage?.statuses?.[0]?.product_data?.status;
        if (!status) return null;

        const rawIcon = STATUS_ICON_REPOSITORY[status];
        if (!rawIcon) return null;

        if (rawIcon.type === "inline-svg" && rawIcon.svgContent) {
            if (!this.sanitizedIconCache[status]) {
                this.sanitizedIconCache[status] = this.sanitizer.bypassSecurityTrustHtml(
                    rawIcon.svgContent,
                );
            }
            return { ...rawIcon, safeSvg: this.sanitizedIconCache[status] };
        }

        return rawIcon;
    }

    ngOnInit(): void {
        this.watchQueryParams();
    }

    get queryParams() {
        return {
            "messaging_product_contact.id": this.messagingProductContact.id,
            mode: "chat",
            ...(this.messageId
                ? {
                      "message.id": this.messageId,
                      "message.created_at": this.date,
                  }
                : {}),
            ...this.queryParamsService.globalQueryParams,
        };
    }

    private watchQueryParams() {
        this.route.queryParams.subscribe(params => {
            this.isSelected =
                params["messaging_product_contact.id"] === this.messagingProductContact.id &&
                (this.messageId ? params["message.id"] === this.messageId : true);

            if (this.isSelected) this.select.emit(this.messagingProductContact);
        });
    }

    /* ---------------- focus handling ------------------ */
    /** `ChatsSidebarComponent` toggles this to make just ONE row tabbable */
    @HostBinding("attr.tabindex") tabIndex = -1;
    /** used only for a visual ring */
    @HostBinding("class.focus-ring") isFocused = false;

    /** reference to the root anchor */
    @ViewChild("rootAnchor", { static: true })
    anchor!: ElementRef<HTMLAnchorElement>;

    /** Press Enter or Space ⇒ click the anchor */
    @HostListener("keydown.enter", ["$event"])
    handleKey(e: KeyboardEvent) {
        e.preventDefault(); // avoid page scroll on Space
        this.anchor.nativeElement.click();
    }
}
