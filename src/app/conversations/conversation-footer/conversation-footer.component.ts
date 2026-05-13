import { CommonModule } from "@angular/common";
import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    Output,
    ViewChild,
    OnInit,
    inject,
} from "@angular/core";
import { SenderData } from "../../../core/message/model/sender-data.model";
import { SentMessageEvent } from "../../../core/message/model/sent-message-event.model";
import { isMediaType, MessageType } from "../../../core/message/model/message-type.model";
import { MessageControllerService } from "../../../core/message/controller/message-controller.service";
import { MessageFields } from "../../../core/message/entity/message.entity";
import { SmallButtonComponent } from "../../common/small-button/small-button.component";
import { MediaControllerService } from "../../../core/media/controller/media-controller.service";
import { FormsModule } from "@angular/forms";
import { InteractiveMessageBuilderComponent } from "../interactive-message-builder/interactive-message-builder.component";
import { LocationMessageBuilderComponent } from "../location-message-builder/location-message-builder.component";
import { MessageReplyHeaderComponent } from "../../messages/message-reply-header/message-reply-header.component";
import { Conversation } from "../../../core/message/model/conversation.model";
import { Context } from "../../../core/message/model/context.model";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { MatIconModule } from "@angular/material/icon";
import { MediaMessageFileUploadComponent } from "../../messages/media-message-file-upload/media-message-file-upload.component";
import { MessageTypeSelectorComponent } from "../../messages/message-type-selector/message-type-selector.component";
import { NGXLogger } from "ngx-logger";
import { ContactsMessageBuilderComponent } from "../contacts-message-builder/contacts-message-builder.component";
import { TypingIndicatorService } from "../../../core/message/service/typing-indicator.service";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-conversation-footer",
    imports: [
        CommonModule,
        SmallButtonComponent,
        FormsModule,
        MessageTypeSelectorComponent,
        InteractiveMessageBuilderComponent,
        ContactsMessageBuilderComponent,
        LocationMessageBuilderComponent,
        MessageReplyHeaderComponent,
        TimeoutErrorModalComponent,
        MatIconModule,
        MediaMessageFileUploadComponent,
    ],
    templateUrl: "./conversation-footer.component.html",
    styleUrl: "./conversation-footer.component.scss",
    standalone: true,
})
export class ConversationFooterComponent implements OnInit {
    private messageController = inject(MessageControllerService);
    private mediaController = inject(MediaControllerService);
    private logger = inject(NGXLogger);
    private typingIndicator = inject(TypingIndicatorService);

    MessageType = MessageType;
    mediaByUrl = false;
    selectedFile?: File;
    textBody = "";
    caption = "";
    filename = "";
    link = "";
    replyToMessage?: Conversation;
    messageTypeSelectorOpen = false;

    _messageType: MessageType | "raw" = MessageType.text;
    set messageType(type: MessageType | "raw") {
        this.messageTypeSelectorOpen = false;
        this._messageType = type;
    }
    get messageType(): MessageType | "raw" {
        return this._messageType;
    }

    @Input() contactName!: string;
    @Input("toPhoneNumber") toPhoneNumberInput!: string;
    @Input("toId") toIdInput!: string;
    @Input() sendAvailable = true;
    @Input() buildMessageOnChanges = false;
    @Output() sent = new EventEmitter<SentMessageEvent>();
    @Output() change = new EventEmitter();
    @Output() typingStateChange = new EventEmitter<boolean>();
    @ViewChild("area") area!: ElementRef<HTMLTextAreaElement>;
    @ViewChild("mediaLinkArea") mediaLinkArea!: ElementRef<HTMLTextAreaElement>;
    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;
    @ViewChild("mediaCaptionArea")
    mediaCaptionArea!: ElementRef<HTMLTextAreaElement>;

    // Message builder
    @ViewChild("interactiveMessageBuilder")
    interactiveMessageBuilder!: InteractiveMessageBuilderComponent;
    @ViewChild("locationMessageBuilder")
    locationMessageBuilder!: LocationMessageBuilderComponent;
    @ViewChild("contactsMessageBuilder")
    contactsMessageBuilder!: ContactsMessageBuilderComponent;

    private _senderData: SenderData = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: this.toPhoneNumberInput,
        type: MessageType.text,
    };
    @Input("senderData")
    get senderData(): SenderData {
        return this._senderData;
    }
    set senderData(value: SenderData) {
        this._senderData = value;
        const type = value.type;
        setTimeout(() => {
            this.messageType = type;
        });
        switch (type) {
            case MessageType.text:
                if (value?.text) this.textBody = value.text.body;
                return;
            case MessageType.image:
            case MessageType.video:
            case MessageType.sticker:
            case MessageType.document:
                if (value[type]?.caption) this.caption = value[type].caption;
                if (value[type]?.link) {
                    this.mediaByUrl = true;
                    this.link = value[type].link;
                }
                if (value[type]?.filename) this.filename = value[type].filename;
                return;
            case MessageType.interactive:
                setTimeout(() => {
                    this.interactiveMessageBuilder.senderData = value;
                });
                return;
            case MessageType.location:
                setTimeout(() => {
                    this.locationMessageBuilder.senderData = value;
                });
                return;
        }
    }

    // Validation Errors
    errors: Record<string, string> = {};

    ngOnInit(): void {
        this.typingIndicator.isTyping$(this.toIdInput).subscribe(isTyping => {
            this.typingStateChange.emit(isTyping);
        });
    }

    adjustHeight(area: HTMLTextAreaElement): void {
        if (!area) return;
        area.style.height = "auto"; // Reset height to auto to get the correct scrollHeight
        area.style.height = `${area.scrollHeight}px`; // Set height to scrollHeight
    }

    async send() {
        this.errors = {}; // Reset errors

        this.validateForm();
        if (Object.keys(this.errors).length > 0) return;

        let context: Context | undefined = undefined;
        if (this.replyToMessage) {
            if (this.replyToMessage.receiver_data) {
                context = {
                    message_id: this.replyToMessage.receiver_data.id,
                };
            } else if (this.replyToMessage.product_data?.messages.length) {
                context = {
                    message_id: this.replyToMessage.product_data?.messages[0].id,
                };
            }
        }

        try {
            switch (this.messageType) {
                case MessageType.text: {
                    const sendText = this.sendText(context);
                    this.typingIndicator.awaitResponse(this.toIdInput, sendText);
                    setTimeout(() => {
                        this.adjustHeight(this.area.nativeElement);
                    });
                    this.replyToMessage = undefined;
                    const sentText = await sendText;
                    return sentText;
                }
                case MessageType.image:
                case MessageType.video:
                case MessageType.sticker:
                case MessageType.document: {
                    const sendMedia = this.sendMedia(context);
                    this.typingIndicator.awaitResponse(this.toIdInput, sendMedia);
                    setTimeout(() => {
                        this.adjustHeight(this.mediaLinkArea.nativeElement);
                        this.adjustHeight(this.mediaCaptionArea.nativeElement);
                    });
                    this.replyToMessage = undefined;
                    const sentMedia = await sendMedia;
                    return sentMedia;
                }
                case MessageType.interactive: {
                    const sendInteractive = this.interactiveMessageBuilder.sendInteractive(context);
                    this.typingIndicator.awaitResponse(this.toIdInput, sendInteractive);
                    this.replyToMessage = undefined;
                    const sentInteractive = await sendInteractive;
                    return sentInteractive;
                }
                case MessageType.location: {
                    const sendLocation = this.locationMessageBuilder.send(context);
                    this.typingIndicator.awaitResponse(this.toIdInput, sendLocation);
                    this.replyToMessage = undefined;
                    const sentLocation = await sendLocation;
                    return sentLocation;
                }
                case MessageType.contacts: {
                    const sendContacts = this.contactsMessageBuilder.send(context);
                    this.typingIndicator.awaitResponse(this.toIdInput, sendContacts);
                    this.replyToMessage = undefined;
                    const sentContacts = await sendContacts;
                    return sentContacts;
                }
                default: {
                    const sendRaw = this.sendRaw(context);
                    this.typingIndicator.awaitResponse(this.toIdInput, sendRaw);
                    setTimeout(() => {
                        this.adjustHeight(this.area.nativeElement);
                    });
                    this.replyToMessage = undefined;
                    const sentRaw = await sendRaw;
                    return sentRaw;
                }
            }
        } catch (error) {
            this.handleErr("Error sending message.", error);
            return Promise.reject(error);
        }
    }

    private async buildText() {
        const senderData = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.toPhoneNumberInput,
            type: MessageType.text,
            text: {
                body: this.textBody,
                preview_url: this.senderData.text?.preview_url ?? true,
            },
        };
        Object.assign(this.senderData, senderData);
    }

    private async sendText(context?: Context): Promise<MessageFields> {
        await this.buildText();
        const payload = {
            to_id: this.toIdInput,
            sender_data: {
                ...this.senderData,
                context,
            },
        };
        const httpResponse = this.messageController.sendWhatsAppMessage(payload);
        this.sent.emit({ senderData: payload.sender_data, httpResponse });
        this.resetForm();
        return httpResponse;
    }

    private async buildRaw() {
        if (!this.textBody) return;
        const senderData = JSON.parse(this.textBody) as Record<string, unknown>;
        Object.assign(this.senderData, senderData);
    }

    private async sendRaw(context?: Context): Promise<MessageFields> {
        try {
            await this.buildRaw();
            const payload = {
                to_id: this.toIdInput,
                sender_data: {
                    context,
                    ...this.senderData,
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: this.toPhoneNumberInput,
                },
            };
            const httpResponse = this.messageController.sendWhatsAppMessage(payload);
            this.sent.emit({ senderData: payload.sender_data, httpResponse });
            this.resetForm();
            return httpResponse;
        } catch (error) {
            this.handleErr("Error processing raw message.", error);
            return Promise.reject(error);
        }
    }

    private async buildMedia() {
        let caption: string | undefined = undefined;
        let id: string | undefined = undefined;
        let filename: string | undefined;
        let link: string | undefined = undefined;

        if (this.caption) caption = this.caption;
        if (this.mediaByUrl) {
            link = this.link;
        } else if (this.selectedFile) {
            const mimeType = this.selectedFile.type;
            try {
                const uploadResponse = await this.mediaController.uploadMedia(
                    this.selectedFile,
                    mimeType,
                );
                id = uploadResponse.id;
                filename = this.selectedFile.name;
            } catch (error) {
                this.handleErr("Failed to upload media.", error);
                return Promise.reject(error);
            }
        }

        const messageType = this.messageType as
            | MessageType.image
            | MessageType.audio
            | MessageType.video
            | MessageType.document
            | MessageType.sticker;
        const senderData = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.toPhoneNumberInput,
            type: this.messageType as MessageType,
            [messageType]: {
                caption,
                id,
                link,
                filename: messageType === MessageType.document ? filename : undefined,
            },
        };
        Object.assign(this.senderData, senderData);
    }

    private async sendMedia(context?: Context): Promise<MessageFields> {
        await this.buildMedia();

        const payload = {
            to_id: this.toIdInput,
            sender_data: {
                ...this.senderData,
                context,
            },
        };
        const httpResponse = this.messageController.sendWhatsAppMessage(payload);
        this.sent.emit({ senderData: payload.sender_data, httpResponse });
        this.resetForm();
        return httpResponse;
    }

    private resetForm() {
        if (this.messageType === MessageType.interactive)
            this.interactiveMessageBuilder.resetForm();
        if (this.messageType === MessageType.location) this.locationMessageBuilder.resetForm();
        this.messageType = MessageType.text;
        this.textBody = "";
        this.mediaByUrl = false;
        this.selectedFile = undefined;
        this.errors = {};
    }

    isMediaType = isMediaType;

    onMediaModeChange(event: string) {
        this.mediaByUrl = event === "true";
    }

    onFileSelected(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.files || target.files.length <= 0) return (this.selectedFile = undefined);

        this.selectedFile = target.files[0];
    }

    // Validation Logic
    private validateForm() {
        switch (this.messageType) {
            case MessageType.text:
                if (!this.textBody) this.errors["text"] = "Text message is required.";
                break;
            case MessageType.image:
            case MessageType.video:
            case MessageType.audio:
            case MessageType.document:
            case MessageType.sticker:
                if (!this.mediaByUrl && !this.selectedFile)
                    this.errors["media"] = "Either upload a file or provide a link.";
                break;
            case MessageType.interactive:
                this.interactiveMessageBuilder.validate();
                break;
            case MessageType.contacts:
                // this.contactsMessageBuilder.validate();
                break;
            // case MessageType.template:
            // case MessageType.reaction:
            case "raw":
                try {
                    JSON.parse(this.textBody);
                } catch {
                    this.errors["raw"] = "Invalid JSON format.";
                }
                break;
        }
        return true;
    }

    trackByIndex(index: number) {
        return index;
    }

    setReplyToMessage(message: Conversation) {
        this.replyToMessage = message;
    }

    closeReplyHeader() {
        this.replyToMessage = undefined;
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

    onMessageChange() {
        // Trigger typing indicator when user types
        this.handleTyping();

        if (!this.buildMessageOnChanges) return this.change.emit();
        this.buildMessage();
        this.change.emit();
    }

    handleTyping() {
        this.typingIndicator.noteUserInput(this.toIdInput);
    }

    async buildMessage() {
        this.errors = {}; // Reset errors

        this.validateForm();
        if (Object.keys(this.errors).length > 0) return;

        // TODO: Add context support.
        // let context: Context | undefined = undefined;
        // if (this.replyToMessage) {
        //     if (this.replyToMessage.receiver_data) {
        //         context = {
        //             message_id: this.replyToMessage.receiver_data.id,
        //         };
        //     } else if (this.replyToMessage.product_data?.messages.length) {
        //         context = {
        //             message_id:
        //                 this.replyToMessage.product_data?.messages[0].id,
        //         };
        //     }
        // }

        try {
            switch (this.messageType) {
                case MessageType.text:
                    await this.buildText();
                    return;
                case MessageType.image:
                case MessageType.video:
                case MessageType.sticker:
                case MessageType.document:
                    await this.buildMedia();
                    return;
                case MessageType.interactive: {
                    await this.interactiveMessageBuilder.buildInteractive();
                    const senderDataInteractive = this.interactiveMessageBuilder.senderData;
                    Object.assign(this.senderData, senderDataInteractive);
                    return;
                }
                case MessageType.location: {
                    await this.locationMessageBuilder.buildLocation();
                    const senderDataLocation = this.locationMessageBuilder.senderData;
                    Object.assign(this.senderData, senderDataLocation);
                    return;
                }
                case MessageType.contacts: {
                    this.contactsMessageBuilder.buildContacts();
                    const senderDataContacts = this.contactsMessageBuilder.senderData;
                    this.logger.debug("Sender data from contacts builder:", senderDataContacts);
                    Object.assign(this.senderData, senderDataContacts);
                    return;
                }
                default:
                    await this.buildRaw();
                    return;
            }
        } catch (error) {
            this.handleErr("Error building message.", error);
            return Promise.reject(error);
        }
    }

    // Shortcuts
    //
    /* Ctrl/⌘ m – toggle types selector */
    @HostListener("window:keydown.control.m", ["$event"])
    private handleControlM(e: KeyboardEvent) {
        e.preventDefault();
        this.messageTypeSelectorOpen = !this.messageTypeSelectorOpen;
    }
    @HostListener("window:keydown.control.y", ["$event"])
    private handleControlY(e: KeyboardEvent) {
        e.preventDefault();
        this.area.nativeElement.focus();
    }
}
