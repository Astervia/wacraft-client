import { Injectable, inject } from "@angular/core";
import { ConversationControllerService } from "../controller/conversation-controller.service";
import { MessageControllerService } from "../controller/message-controller.service";
import { Conversation } from "../model/conversation.model";
import { DateOrderEnum } from "../../common/model/date-order.model";
import { ActivatedRoute } from "@angular/router";
import { MessageGatewayService } from "../gateway/message-gateway.service";
import { MessagingProductContactFromMessagePipe } from "../pipe/messaging-product-contact-from-message.pipe";
import { LocalSettingsService } from "../../../app/local-settings.service";
import { SenderData } from "../model/sender-data.model";
import { Subject } from "rxjs";
import { NIL as NilUUID } from "uuid";
import { StatusGatewayService } from "../../status/gateway/status-gateway.service";
import { Status } from "../../status/entity/status.entity";
import { statusOrder } from "../../status/constant/status-order.constant";
import { MutexSwapper } from "../../synch/mutex-swapper/mutex-swapper";
import { NGXLogger } from "ngx-logger";
import { DeepEqualService } from "../../common/comparator";

@Injectable({
    providedIn: "root",
})
export class UserConversationsStoreService {
    private conversationController = inject(ConversationControllerService);
    private messageController = inject(MessageControllerService);
    private mpContactFromMessage = inject(MessagingProductContactFromMessagePipe);
    private localSettings = inject(LocalSettingsService);
    private messageGateway = inject(MessageGatewayService);
    private statusGateway = inject(StatusGatewayService);
    private logger = inject(NGXLogger);
    private deepEqual = inject(DeepEqualService);

    public paginationLimit = 50;

    public newBottomMessageFromConversations = new Map<string, Subject<Conversation>>();

    public messageHistory = new Map<string, Conversation[]>();
    public unsentMessages = new Map<string, Conversation[]>();
    private initPromise: Promise<void> | null = null;
    public async initConditionally(
        route: ActivatedRoute,
        messagingProductContactId: string,
    ): Promise<void> {
        await this.createBottomMessageSubjectIfNotExists(messagingProductContactId);
        // If we have already started (or finished) initializing, just reuse that.
        if (!this.initPromise) this.initPromise = this.init(route);

        return this.initPromise;
    }
    private async init(route: ActivatedRoute): Promise<void> {
        await Promise.all([
            this.messageGateway.opened,
            this.messageGateway.watchNewMessage(async (msg: Conversation) => {
                const messagingProductContactId = this.mpContactFromMessage.transform(msg).id;
                if (msg.sender_data) this.removeSent(msg.sender_data, messagingProductContactId);
                this.appendConversationIfAtBottom(msg, messagingProductContactId);

                const mpcId = route.snapshot.queryParamMap.get("messaging_product_contact.id");
                if (!mpcId || !this.localSettings.autoMarkAsRead) return;
                this.markAsRead(mpcId);
            }),
            this.statusGateway.opened,
            this.statusGateway.watchNewStatus((data: Status) => {
                const messageId = data.message_id;
                const message = [...this.messageHistory.values()] // get all arrays
                    .flat() // flatten into a single array
                    .find(item => item.id === messageId); // find by messageId
                if (!message) return;

                if (!message.statuses) message.statuses = [];

                const currentStatus = message.statuses[0]?.product_data?.status;
                if (message.statuses.length === 0 || !data.product_data.status || !currentStatus)
                    return message.statuses.unshift(data);

                const currentOrder = statusOrder.get(currentStatus) || 0;
                const incommingOrder = statusOrder.get(data.product_data.status) || 0;
                if (incommingOrder < currentOrder) return message.statuses.unshift(data);
                return message.statuses.push(data);
            }),
        ]);
    }

    private getMutex = new MutexSwapper<string>();
    async getTop(messagingProductContactId: string): Promise<void> {
        await this.offsetMu.acquire(messagingProductContactId);
        const offset = this.offsets.get(messagingProductContactId) || 0;
        this.logger.debug("Getting top with offset", offset);
        await this.offsetMu.release(messagingProductContactId);

        await this.getMutex.acquire(messagingProductContactId);
        try {
            const currentHistory = this.messageHistory.get(messagingProductContactId) || [];
            const conversations = await this.conversationController.getByMessagingProductContact(
                messagingProductContactId,
                undefined,
                {
                    limit: this.paginationLimit,
                    offset: offset + currentHistory.length,
                },
                { created_at: DateOrderEnum.desc },
            );

            if (!conversations.length)
                return await this.setReachedMaxLimit(messagingProductContactId);

            this.append(conversations, messagingProductContactId);
        } finally {
            await this.getMutex.release(messagingProductContactId);
        }
    }

    async getBottom(messagingProductContactId: string): Promise<void> {
        try {
            await this.offsetMu.acquire(messagingProductContactId);
            let offset = this.offsets.get(messagingProductContactId) || 0;
            const limit = Math.min(this.paginationLimit, offset);
            offset = Math.max(0, offset - this.paginationLimit);
            this.offsets.set(messagingProductContactId, offset);
            await this.offsetMu.release(messagingProductContactId);

            await this.getMutex.acquire(messagingProductContactId);
            const conversations = await this.conversationController.getByMessagingProductContact(
                messagingProductContactId,
                undefined,
                {
                    limit: limit,
                    offset: offset,
                },
                { created_at: DateOrderEnum.desc },
            );

            this.unshift(conversations, messagingProductContactId);
        } finally {
            await this.getMutex.release(messagingProductContactId);
        }
    }

    private unshift(conversations: Conversation[], messagingProductContactId: string) {
        const currentConversations = this.messageHistory.get(messagingProductContactId) || [];

        if (currentConversations) return currentConversations.unshift(...conversations);

        return this.messageHistory.set(messagingProductContactId, conversations);
    }

    private append(conversations: Conversation[], messagingProductContactId: string) {
        const currentConversations = this.messageHistory.get(messagingProductContactId);
        if (currentConversations) return currentConversations.push(...conversations);

        return this.messageHistory.set(messagingProductContactId, conversations);
    }

    private async removeSent(senderData: SenderData, messagingProductContactId: string) {
        await this.unsentMutex.acquire(messagingProductContactId);

        const unsentMessages = this.unsentMessages.get(messagingProductContactId);
        if (!unsentMessages) return;
        const index = unsentMessages.findIndex(msg =>
            msg.sender_data
                ? this.deepEqual.areEqual(
                      msg.sender_data[msg.sender_data.type],
                      senderData[msg.sender_data.type],
                  )
                : false,
        );
        if (index !== -1) {
            unsentMessages.splice(index, 1);
            this.unsentMessages.set(messagingProductContactId, unsentMessages);
        }

        await this.unsentMutex.release(messagingProductContactId);
    }

    private offsetMu = new MutexSwapper<string>();
    async appendConversationIfAtBottom(
        conversation: Conversation,
        messagingProductContactId: string,
    ) {
        await this.offsetMu.acquire(messagingProductContactId);

        const offset = this.offsets.get(messagingProductContactId) || 0;
        if (offset > 0) {
            this.offsets.set(messagingProductContactId, offset + 1);

            await this.offsetMu.release(messagingProductContactId);
            return;
        }

        await this.offsetMu.release(messagingProductContactId);

        this.unshift([conversation], messagingProductContactId);
        (await this.createBottomMessageSubjectIfNotExists(messagingProductContactId)).next(
            conversation,
        );
    }

    async markAsRead(messagingProductContactId: string) {
        await this.messageController.markConversationAsReadToUser(
            {
                from_id: messagingProductContactId,
            },
            {
                offset: 0,
                limit: 1,
            },
            {
                created_at: DateOrderEnum.desc,
            },
        );
    }

    async sendTyping(messagingProductContactId: string) {
        await this.messageController.sendTypingToUser(
            {
                from_id: messagingProductContactId,
            },
            {
                offset: 0,
                limit: 1,
            },
            {
                created_at: DateOrderEnum.desc,
            },
        );
    }

    private createBottomMsgSubMu = new MutexSwapper<string>();
    private async createBottomMessageSubjectIfNotExists(
        messagingProductContactId: string,
    ): Promise<Subject<Conversation>> {
        await this.createBottomMsgSubMu.acquire(messagingProductContactId);
        try {
            const curretConversation =
                this.newBottomMessageFromConversations.get(messagingProductContactId);
            if (curretConversation) return curretConversation;
            const newSubject = new Subject<Conversation>();
            this.newBottomMessageFromConversations.set(messagingProductContactId, newSubject);

            return newSubject;
        } finally {
            await this.createBottomMsgSubMu.release(messagingProductContactId);
        }
    }

    private unsentMutex = new MutexSwapper<string>();
    async addUnsent(senderData: SenderData, messagingProductContactId: string) {
        this.logger.debug("addUnsent", senderData, messagingProductContactId);
        await this.unsentMutex.acquire(messagingProductContactId);
        this.logger.debug("Unsent acquired for", messagingProductContactId);

        const unsentMessages = this.unsentMessages.get(messagingProductContactId) || [];
        const conversation = {
            id: "",
            sender_data: senderData,
            to_id: messagingProductContactId,
            from_id: NilUUID,
            messaging_product_id: "",
            created_at: new Date(),
            updated_at: new Date(),
        };
        unsentMessages.unshift(conversation);

        this.unsentMessages.set(messagingProductContactId, unsentMessages);

        (await this.createBottomMessageSubjectIfNotExists(messagingProductContactId)).next(
            conversation,
        );

        await this.unsentMutex.release(messagingProductContactId);
        this.logger.debug("Unsent mutex released for", messagingProductContactId);
    }

    private offsets = new Map<string, number>();
    async getOffset(mpcId: string) {
        try {
            await this.offsetMu.acquire(mpcId);

            const offset = this.offsets.get(mpcId) || 0;

            return offset;
        } finally {
            await this.offsetMu.release(mpcId);
        }
    }
    async setOffset(mpcId: string, offset: number) {
        try {
            await this.offsetMu.acquire(mpcId);

            this.offsets.set(mpcId, offset);
        } finally {
            await this.offsetMu.release(mpcId);
        }
    }

    async resetHistory(mpcId: string) {
        await this.getMutex.acquire(mpcId);
        this.messageHistory.set(mpcId, []);
        await this.getMutex.release(mpcId);
    }

    private reachedMaxLimit = new Map<string, boolean>();
    private reachedMaxLimitMu = new MutexSwapper<string>();
    async getReachedMaxLimit(messagingProductContactId: string): Promise<boolean> {
        await this.reachedMaxLimitMu.acquire(messagingProductContactId);
        try {
            return this.reachedMaxLimit.get(messagingProductContactId) || false;
        } finally {
            await this.reachedMaxLimitMu.release(messagingProductContactId);
        }
    }
    async setReachedMaxLimit(messagingProductContactId: string) {
        await this.reachedMaxLimitMu.acquire(messagingProductContactId);
        try {
            this.reachedMaxLimit.set(messagingProductContactId, true);
        } finally {
            await this.reachedMaxLimitMu.release(messagingProductContactId);
        }
    }
}
