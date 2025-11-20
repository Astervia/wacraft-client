import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    Output,
    ViewChild,
    inject,
} from "@angular/core";
import { MessageInfoDataComponent } from "../message-info-data/message-info-data.component";
import { Conversation } from "../../../core/message/model/conversation.model";
import { MessageControllerService } from "../../../core/message/controller/message-controller.service";
import { DateOrderEnum } from "../../../core/common/model/date-order.model";
import { NIL as NilUUID } from "uuid";
import { MatIconModule } from "@angular/material/icon";
import { PickerModule } from "@ctrl/ngx-emoji-mart";
import { NGXLogger } from "ngx-logger";
import { SenderData } from "../../../core/message/model/sender-data.model";
import { MessageType } from "../../../core/message/model/message-type.model";
import { MessageIdPipe } from "../../../core/message/pipe/message-id.pipe";
import { MessageFields } from "../../../core/message/entity/message.entity";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { MessageDataPipe } from "../../../core/message/pipe/message-data.pipe";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";

interface EmojiSelectEvent {
    emoji: {
        native: string;
    };
}

@Component({
    selector: "app-message-options",
    imports: [
        MessageInfoDataComponent,
        MatIconModule,
        PickerModule,
        TimeoutErrorModalComponent,
        MessageDataPipe,
    ],
    templateUrl: "./message-options.component.html",
    styleUrl: "./message-options.component.scss",
    standalone: true,
})
export class MessageOptionsComponent {
    private elementRef = inject(ElementRef);
    private messageController = inject(MessageControllerService);
    private messageIdPipe = inject(MessageIdPipe);
    private logger = inject(NGXLogger);

    MessageType = MessageType;

    @Input() message!: Conversation;

    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;
    @Output() reply = new EventEmitter();
    @Output() close = new EventEmitter();
    @Output() reactionSent = new EventEmitter<SenderData>();
    @Input("toPhoneNumber") toPhoneNumberInput!: string;
    @Input("toId") toIdInput!: string;
    @Output() selectMessage = new EventEmitter();

    reaction = "";

    showMessageInfo = false;

    errorStr = "";
    errorData: unknown;

    get senderData(): SenderData {
        return {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            reaction: {
                message_id: this.messageIdPipe.transform(this.message),
                emoji: this.reaction,
            },
            to: this.toPhoneNumberInput,
            type: MessageType.reaction,
        };
    }

    replyToMessage(): void {
        this.reply.emit();
        this.close.emit();
    }

    openMessageInfo(): void {
        this.showMessageInfo = true;
    }

    closeMessageInfo(): void {
        this.showMessageInfo = false;
        this.close.emit();
    }

    onSelectMessage(event: Event) {
        event.stopPropagation(); // ✅ Prevents click from reaching <li>
        this.selectMessage.emit(this.message);
        this.close.emit();
    }

    showEmojiPicker = false;
    toggleEmojiPicker(): void {
        this.showEmojiPicker = !this.showEmojiPicker;
    }

    async onEmojiSelect(event: EmojiSelectEvent) {
        this.logger.debug("Emoji selected", event);
        const nativeEmoji = event.emoji?.native;
        if (!nativeEmoji) return;
        this.reaction = nativeEmoji;
        await this.sendReaction();

        // Close UI helpers
        this.showEmojiPicker = false;
        this.close.emit();
    }

    async sendReaction(): Promise<MessageFields> {
        try {
            this.reactionSent.emit(this.senderData);
            const response = await this.messageController.sendWhatsAppMessage({
                sender_data: this.senderData,
                to_id: this.toIdInput,
            });
            return response;
        } catch (error) {
            this.handleErr("Error sending reaction.", error);
            return Promise.reject(error);
        }
    }

    async markAsRead() {
        try {
            let mpcId: string;
            if (this.message.from_id && this.message.from_id != NilUUID)
                mpcId = this.message.from_id;
            else mpcId = this.message.to_id;

            await this.messageController.markConversationAsReadToUser(
                {
                    from_id: mpcId,
                    id: this.message.id,
                },
                {
                    offset: 0,
                    limit: 1,
                },
                {
                    created_at: DateOrderEnum.desc,
                },
            );
            this.close.emit();
        } catch (error) {
            this.handleErr("Error marking message as read.", error);
            return Promise.reject(error);
        }
    }

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

    // Shortcuts
    //
    // Close shortcuts
    @HostListener("document:click", ["$event"])
    private onDocumentClick(event: MouseEvent): void {
        if (!this.elementRef.nativeElement.contains(event.target)) this.close.emit();
    }
    @HostListener("window:keydown.shift.escape", ["$event"])
    private closeOnShiftEscape(event: KeyboardEvent) {
        event.preventDefault();
        this.close.emit();
    }
    // Functional shortcuts
    @HostListener("window:keydown.control.r", ["$event"])
    private onCtrlR(event: KeyboardEvent) {
        event.preventDefault();
        this.replyToMessage();
    }
    @HostListener("window:keydown.control.d", ["$event"])
    private onCtrlD(event: KeyboardEvent) {
        event.preventDefault();
        this.openMessageInfo();
    }
    @HostListener("window:keydown.control.m", ["$event"])
    private onCtrlM(event: KeyboardEvent) {
        event.preventDefault();
        this.markAsRead();
    }
}
