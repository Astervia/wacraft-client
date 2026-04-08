import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, inject } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import {
    Conversation,
    ConversationMessagingProductContact,
} from "../../../../core/message/model/conversation.model";
import { MessageDataPipe } from "../../../../core/message/pipe/message-data.pipe";
import { StatusGatewayService } from "../../../../core/status/gateway/status-gateway.service";
import { MessageContentPreviewComponent } from "../../../messages/message-content-preview/message-content-preview.component";
import {
    STATUS_ICON_REPOSITORY,
    IMessageStatusIcon,
} from "../../../common/repository/status-icon.repository";

@Component({
    selector: "app-conversation-preview",
    imports: [CommonModule, MessageContentPreviewComponent, MessageDataPipe],
    templateUrl: "./conversation-preview.component.html",
    styleUrl: "./conversation-preview.component.scss",
    standalone: true,
})
export class ConversationPreviewComponent {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private statusGateway = inject(StatusGatewayService);
    private sanitizer = inject(DomSanitizer);

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

    @Input()
    messagingProductContact!: ConversationMessagingProductContact;

    @Input() messageId?: string;
    @Input() lastMessage!: Conversation;
    @Input() date!: Date;
    @Input() unread = 0;
    @Input() selected = false;

    @Output() select = new EventEmitter<ConversationMessagingProductContact>();
    @Output() unSelect = new EventEmitter<ConversationMessagingProductContact>();

    handleClick() {
        if (this.selected) {
            this.unSelect.emit(this.messagingProductContact);
            return;
        }
        this.select.emit(this.messagingProductContact);
    }
}
