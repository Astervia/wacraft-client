import { Component, EventEmitter, Input, Output, ViewChild, inject } from "@angular/core";
import { SenderData } from "../../../core/message/model/sender-data.model";
import { MessageControllerService } from "../../../core/message/controller/message-controller.service";
import { SmallButtonComponent } from "../../common/small-button/small-button.component";
import { MediaControllerService } from "../../../core/media/controller/media-controller.service";
import {
    Conversation,
    ConversationMessagingProductContact,
} from "../../../core/message/model/conversation.model";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { MatIconModule } from "@angular/material/icon";
import { NGXLogger } from "ngx-logger";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";
import { ContactsModalComponent } from "../../contacts/contact-modal/contacts-modal.component";

@Component({
    selector: "app-message-actions-footer",
    imports: [
        SmallButtonComponent,
        TimeoutErrorModalComponent,
        MatIconModule,
        ContactsModalComponent,
    ],
    templateUrl: "./message-actions-footer.component.html",
    styleUrl: "./message-actions-footer.component.scss",
})
export class MessageActionsFooterComponent {
    private messageController = inject(MessageControllerService);
    private mediaController = inject(MediaControllerService);
    private logger = inject(NGXLogger);

    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    @Input() messages!: Conversation[];

    @Output() clear = new EventEmitter();
    @Output() sent = new EventEmitter<[SenderData, string]>();

    async sendMessagesToContacts(contacts: ConversationMessagingProductContact[]) {
        const sendPromises = Promise.all(
            this.messages.map(message => this.sendMessageToContacts(contacts, message)),
        );
        this.clear.emit();
        return await sendPromises;
    }

    async sendMessageToContacts(
        contacts: ConversationMessagingProductContact[],
        message: Conversation,
    ) {
        const sendPromises = contacts.map(contact => {
            const sender_data = {
                ...(message?.sender_data ?? message?.receiver_data),
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: contact.product_details.phone_number,
            } as SenderData;
            const to_id = contact.id;
            const promise = this.messageController
                .sendWhatsAppMessage({
                    to_id,
                    sender_data,
                })
                .catch(err => this.handleErr(`Failed to send message to ${to_id}`, err));
            this.sent.emit([sender_data, to_id]);
            return promise;
        });
        return await Promise.all(sendPromises);
    }

    isForwardModalOpen = false;
    closeModal() {
        this.isForwardModalOpen = false;
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
