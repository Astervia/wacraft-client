import {
    Conversation,
    ConversationMessagingProductContact,
} from "../../../core/message/model/conversation.model";

export class ConversationWithUnread {
    message: Conversation;
    unread = 0;
    contact: ConversationMessagingProductContact;

    constructor(message: Conversation, contact: ConversationMessagingProductContact) {
        this.message = message;
        this.contact = contact;
    }

    increaseUnread(): void {
        this.unread++;
    }

    resetUnread(): void {
        this.unread = 0;
    }

    replaceUnread(unread: number): void {
        this.unread = unread;
    }
}
