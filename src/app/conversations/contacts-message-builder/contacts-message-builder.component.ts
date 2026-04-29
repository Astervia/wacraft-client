// contacts-message-builder.component.ts
import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { SenderData } from "../../../core/message/model/sender-data.model";
import { SentMessageEvent } from "../../../core/message/model/sent-message-event.model";
import { MessageType } from "../../../core/message/model/message-type.model";
import { MessageControllerService } from "../../../core/message/controller/message-controller.service";
import { Context } from "../../../core/message/model/context.model";
import { MessageFields } from "../../../core/message/entity/message.entity";
import {
    ContactData,
    ContactEmail,
    ContactOrg,
    ContactPhone,
    ContactURL,
} from "../../../core/message/model/contact-data.model";

interface ContactInternal {
    name: {
        formatted_name: string;
        first_name: string;
        last_name: string;
    };
    phones: (ContactPhone & { is_wa: boolean })[];
    emails: ContactEmail[];
    org: ContactOrg;
    urls: ContactURL[];
    manualFormattedName: boolean;
    showEmails: boolean;
    showOrg: boolean;
    showUrls: boolean;
}

@Component({
    selector: "app-contacts-message-builder",
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule],
    templateUrl: "./contacts-message-builder.component.html",
    styleUrl: "./contacts-message-builder.component.scss",
    preserveWhitespaces: false,
})
export class ContactsMessageBuilderComponent {
    private messageController = inject(MessageControllerService);

    @Input("toId") toIdInput!: string;
    @Input("toPhoneNumber") toPhoneNumberInput!: string;
    @Output() sent = new EventEmitter<SentMessageEvent>();

    contacts: ContactInternal[] = [
        {
            name: { formatted_name: "", first_name: "", last_name: "" },
            phones: [{ phone: "", type: "CELL", is_wa: false }],
            emails: [],
            org: { company: "", department: "", title: "" },
            urls: [],
            manualFormattedName: false,
            showEmails: false,
            showOrg: false,
            showUrls: false,
        },
    ];

    senderData: SenderData = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: this.toPhoneNumberInput,
        type: MessageType.contacts,
    };

    buildContacts(): ContactData[] {
        const payloadContacts: ContactData[] = this.contacts.map(contact => {
            const processedPhones: ContactPhone[] = contact.phones.map(phone => ({
                phone: phone.phone,
                type: phone.type,
                wa_id: phone.is_wa ? phone.phone.replace(/\D/g, "") : undefined,
            }));

            return {
                name: contact.name,
                phones: processedPhones,
                emails: contact.showEmails ? contact.emails : undefined,
                org: contact.showOrg ? contact.org : undefined,
                urls: contact.showUrls ? contact.urls : undefined,
            };
        });

        this.senderData.contacts = payloadContacts;
        this.senderData.type = MessageType.contacts;

        return this.senderData.contacts;
    }

    async send(context?: Context): Promise<MessageFields> {
        this.buildContacts();

        const payload = {
            to_id: this.toIdInput,
            sender_data: {
                ...this.senderData,
                context,
            },
        };

        const httpResponse = this.messageController.sendWhatsAppMessage(payload);
        this.sent.emit({ senderData: payload.sender_data, httpResponse });
        return httpResponse;
    }

    addContact(): void {
        this.contacts.push({
            name: { formatted_name: "", first_name: "", last_name: "" },
            phones: [{ phone: "", type: "CELL", is_wa: false }],
            emails: [],
            org: { company: "", department: "", title: "" },
            urls: [],
            manualFormattedName: false,
            showEmails: false,
            showOrg: false,
            showUrls: false,
        });
    }

    updateFormattedName(contact: ContactInternal): void {
        if (!contact.manualFormattedName) {
            contact.name.formatted_name =
                `${contact.name.first_name} ${contact.name.last_name}`.trim();
        }
    }

    markFormattedNameAsManual(contact: ContactInternal): void {
        contact.manualFormattedName = true;
    }

    removeContact(index: number): void {
        this.contacts.splice(index, 1);
    }

    addPhone(contactIndex: number): void {
        this.contacts[contactIndex].phones.push({
            phone: "",
            type: "CELL",
            is_wa: false,
        });
    }

    toggleWaPhone(contactIndex: number, phoneIndex: number): void {
        const phone = this.contacts[contactIndex].phones[phoneIndex];
        phone.is_wa = !phone.is_wa;
    }

    removePhone(contactIndex: number, phoneIndex: number): void {
        this.contacts[contactIndex].phones.splice(phoneIndex, 1);
    }

    addEmail(contactIndex: number): void {
        this.contacts[contactIndex].emails.push({
            email: "",
            type: "email",
        });
    }

    removeEmail(contactIndex: number, index: number): void {
        this.contacts[contactIndex].emails.splice(index, 1);
    }

    addUrl(contactIndex: number): void {
        this.contacts[contactIndex].urls.push({
            url: "",
            type: "site",
        });
    }

    removeUrl(contactIndex: number, index: number): void {
        this.contacts[contactIndex].urls.splice(index, 1);
    }
}
