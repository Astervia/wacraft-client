import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
    Conversation,
    ConversationMessagingProductContact,
} from "../../../../core/message/model/conversation.model";
import { MessageDataPipe } from "../../../../core/message/pipe/message-data.pipe";
import { StatusGatewayService } from "../../../../core/status/gateway/status-gateway.service";
import { MessageContentPreviewComponent } from "../../../messages/message-content-preview/message-content-preview.component";
import { MessageStatusIconComponent } from "../../../common/message-status-icon/message-status-icon.component";

@Component({
    selector: "app-conversation-preview",
    imports: [
        CommonModule,
        MessageContentPreviewComponent,
        MessageDataPipe,
        MessageStatusIconComponent,
    ],
    templateUrl: "./conversation-preview.component.html",
    styleUrl: "./conversation-preview.component.scss",
    standalone: true,
})
export class ConversationPreviewComponent {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private statusGateway = inject(StatusGatewayService);

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
