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
import {
    Conversation,
    ConversationMessagingProductContact,
} from "../../../core/message/model/conversation.model";
import { CommonModule } from "@angular/common";
import { MessageDataPipe } from "../../../core/message/pipe/message-data.pipe";
import {
    isMediaType,
    MessageType,
    ReceivedMessageType,
} from "../../../core/message/model/message-type.model";
import { MessageMediaContentComponent } from "../message-media-content/message-media-content.component";
import { MessageInfoComponent } from "../message-info/message-info.component";
import { MessageInteractiveContentComponent } from "../message-interactive-content/message-interactive-content.component";
import { SenderData } from "../../../core/message/model/sender-data.model";
import { ReceiverData } from "../../../core/message/model/receiver-data.model";
import { UseMedia } from "../../../core/message/model/media-data.model";
import { MessageTemplateContentComponent } from "../message-template-content/message-template-content.component";
import { MessageLocationContentComponent } from "../message-location-content/message-location-content.component";
import { MessageButtonContentComponent } from "../message-button-content/message-button-content.component";
import { ButtonData } from "../../../core/message/model/button-data.model";
import { MessageForwardedHeaderComponent } from "../message-forwarded-header/message-forwarded-header.component";
import { MessageOptionsComponent } from "../message-options/message-options.component";
import { MessageReactionContentComponent } from "../message-reaction-content/message-reaction-content.component";
import { MessageContactsContentComponent } from "../message-contacts-content/message-contacts-content.component";
import { MessageReplyHeaderComponent } from "../message-reply-header/message-reply-header.component";

@Component({
    selector: "app-conversation-message",
    imports: [
        CommonModule,
        MessageDataPipe,
        MessageMediaContentComponent,
        MessageInfoComponent,
        MessageInteractiveContentComponent,
        MessageTemplateContentComponent,
        MessageLocationContentComponent,
        MessageButtonContentComponent,
        MessageForwardedHeaderComponent,
        MessageReplyHeaderComponent,
        MessageOptionsComponent,
        MessageReactionContentComponent,
        MessageContactsContentComponent,
    ],
    templateUrl: "./conversation-message.component.html",
    styleUrl: "./conversation-message.component.scss",
    standalone: true,
})
export class ConversationMessageComponent {
    private messageDataPipe = inject(MessageDataPipe);

    MessageType = MessageType;
    ReceivedMessageType = ReceivedMessageType;

    @Input() message!: Conversation;
    @Input() contactName!: string;
    @Input() sent = true;

    @Output() reply = new EventEmitter();
    @Output() asyncContentLoaded = new EventEmitter();
    @Output() reactionSent = new EventEmitter<SenderData>();
    @Output() selectMessage = new EventEmitter();

    @ViewChild("templateMessage")
    templateMessage!: MessageTemplateContentComponent;
    @ViewChild("options") options!: ElementRef;
    @Input()
    messagingProductContact!: ConversationMessagingProductContact;

    mediaSafeUrl = ""; // Safe URL for media
    optionsArrow = false;
    optionsOpen = false;

    get isMediaType(): boolean {
        return isMediaType(this.messageType);
    }

    get buttonData() {
        const data = (this.message.sender_data || this.message.receiver_data) as
            | SenderData
            | ReceiverData;
        if (data.type != ReceivedMessageType.button) throw new Error("Message type is not button");
        return data[data.type] as ButtonData;
    }

    get useMediaData() {
        const data = (this.message.sender_data || this.message.receiver_data) as
            | SenderData
            | ReceiverData;
        if (data.type == ReceivedMessageType.button)
            throw new Error("Button message type is not supported as media");
        return data[data.type] as UseMedia;
    }

    get messageType() {
        return this.messageDataPipe.transform(this.message)?.type;
    }

    showOptionsArrow() {
        this.optionsArrow = true;
    }

    hideOptionsArrow() {
        this.optionsArrow = false;
    }

    clickOptionsArrow() {
        this.optionsOpen = !this.optionsOpen;
    }

    closeOptions() {
        this.optionsOpen = false;
    }

    // Listen for clicks in this component
    @HostListener("keydown.enter", ["$event"])
    private onEnter(event: KeyboardEvent) {
        event.preventDefault();
        this.showOptionsArrow();
        this.optionsOpen = true;
    }
    @HostListener("window:keydown.shift.escape", ["$event"])
    private closeOnShiftEscape(event: KeyboardEvent) {
        event.preventDefault();
        this.hideOptionsArrow();
        this.closeOptions();
    }
    @HostListener("blur", ["$event"])
    private onBlur() {
        this.hideOptionsArrow();
        this.closeOptions();
    }
}
