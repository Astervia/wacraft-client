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
import { NIL as NilUUID, v4 as uuidv4 } from "uuid";
import { StatusGatewayService } from "../../status/gateway/status-gateway.service";
import { Status } from "../../status/entity/status.entity";
import { statusOrder } from "../../status/constant/status-order.constant";
import { MutexSwapper } from "../../synch/mutex-swapper/mutex-swapper";
import { NGXLogger } from "ngx-logger";
import { DeepEqualService } from "../../common/comparator";
import { MessageFields } from "../entity/message.entity";

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
    private pendingIds = new Set<string>();
    private messageMutex = new MutexSwapper<string>();
    private sentAt = new Map<string, number>(); // message id → performance.now() at addUnsent
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
                if (msg.sender_data) this.removeSent(msg, messagingProductContactId);
                this.appendConversationIfAtBottom(msg, messagingProductContactId);

                const mpcId = route.snapshot.queryParamMap.get("messaging_product_contact.id");
                if (!mpcId || !this.localSettings.autoMarkAsRead) return;
                this.markAsRead(mpcId);
            }),
            this.statusGateway.opened,
            this.statusGateway.watchNewStatus((data: Status) => {
                const messageId = data.message_id;
                const statusReceivedAt = performance.now();

                let message = this.findMessageById(this.messageHistory, messageId);
                let foundIn: "history" | "unsent" | undefined;
                if (message) {
                    foundIn = "history";
                } else {
                    message = this.findMessageById(this.unsentMessages, messageId);
                    if (message) foundIn = "unsent";
                }

                if (!message) {
                    this.logger.debug(
                        `[msg-timing] status arrived: msgId=${messageId} status=${data.product_data?.status} — not found in history or unsent`,
                    );
                    return;
                }

                const sendTime = this.sentAt.get(messageId);
                this.logger.debug(
                    `[msg-timing] status arrived: msgId=${messageId} status=${data.product_data?.status} foundIn=${foundIn}${sendTime !== undefined ? ` elapsed-since-send=${(statusReceivedAt - sendTime).toFixed(1)}ms` : ""}`,
                );

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

    private async removeSent(incoming: Conversation, messagingProductContactId: string) {
        const wsReceivedAt = performance.now();
        await this.unsentMutex.acquire(messagingProductContactId);

        const unsentMessages = this.unsentMessages.get(messagingProductContactId);
        if (!unsentMessages) {
            await this.unsentMutex.release(messagingProductContactId);
            return;
        }

        // Phase 1: ID-first — scan the whole queue for an exact real-id match.
        // This must run before fallback so that a pending entry at the front of the queue
        // (inserted more recently via unshift) can never shadow a real-id entry further back.
        let strategy: "id" | "fallback" | "none" = "none";
        let index = incoming.id
            ? unsentMessages.findIndex(
                  msg => !this.pendingIds.has(msg.id) && msg.id === incoming.id,
              )
            : -1;
        if (index !== -1) strategy = "id";

        // Phase 2: fallback — only reached when no ID match exists, only scans pending entries.
        if (index === -1) {
            index = unsentMessages.findIndex(
                msg =>
                    this.pendingIds.has(msg.id) &&
                    !!incoming.sender_data &&
                    !!msg.sender_data &&
                    this.deepEqual.areEqual(
                        msg.sender_data[msg.sender_data.type],
                        incoming.sender_data[incoming.sender_data.type],
                    ),
            );
            if (index !== -1) strategy = "fallback";
        }

        if (index !== -1) {
            const [removed] = unsentMessages.splice(index, 1);
            this.pendingIds.delete(removed.id);
            this.unsentMessages.set(messagingProductContactId, unsentMessages);

            const sendTime = this.sentAt.get(removed.id);
            if (sendTime !== undefined) {
                this.logger.debug(
                    `[msg-timing] WS confirmed: strategy=${strategy} total=${(wsReceivedAt - sendTime).toFixed(1)}ms lock-wait=${(performance.now() - wsReceivedAt).toFixed(1)}ms`,
                );
                this.sentAt.delete(removed.id);
            }
        }

        await this.unsentMutex.release(messagingProductContactId);
    }

    private findMessageById(
        map: Map<string, Conversation[]>,
        id: string,
    ): Conversation | undefined {
        for (const list of map.values()) {
            for (const item of list) {
                if (item.id === id) return item;
            }
        }
        return undefined;
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
    async addUnsent(
        senderData: SenderData,
        messagingProductContactId: string,
        httpResponse?: Promise<MessageFields>,
    ) {
        const t0 = performance.now();
        const fakeId = uuidv4();
        this.logger.debug(
            `[msg-timing] addUnsent fakeId=${fakeId} type=${senderData.type} to=${messagingProductContactId}`,
        );

        const conversation: Conversation = {
            id: fakeId,
            sender_data: senderData,
            to_id: messagingProductContactId,
            from_id: NilUUID,
            messaging_product_id: "",
            created_at: new Date(),
            updated_at: new Date(),
        };

        this.pendingIds.add(fakeId);
        this.sentAt.set(fakeId, t0);

        await this.unsentMutex.acquire(messagingProductContactId);
        const listWaitMs = (performance.now() - t0).toFixed(1);
        const unsentMessages = this.unsentMessages.get(messagingProductContactId) || [];
        unsentMessages.unshift(conversation);
        this.unsentMessages.set(messagingProductContactId, unsentMessages);
        await this.unsentMutex.release(messagingProductContactId);
        this.logger.debug(`[msg-timing] fakeId=${fakeId} list-lock-wait=${listWaitMs}ms`);

        (await this.createBottomMessageSubjectIfNotExists(messagingProductContactId)).next(
            conversation,
        );

        httpResponse?.then(async fields => {
            const httpMs = (performance.now() - t0).toFixed(1);
            await this.messageMutex.acquire(fakeId);
            const stillPending = this.unsentMessages
                .get(messagingProductContactId)
                ?.some(m => m.id === fakeId);
            if (stillPending) {
                this.pendingIds.delete(fakeId);
                Object.assign(conversation, fields);
                const realId = conversation.id;
                this.sentAt.set(realId, t0);
                this.sentAt.delete(fakeId);
                await this.messageMutex.release(fakeId);

                // WS may have already arrived for this message and added it to messageHistory
                // while the entry was still pending (WS beat HTTP, or a WS for another message
                // incorrectly evicted our fake entry via fallback). If so, the entry in
                // unsentMessages is now a stale duplicate with the real id — remove it.
                const alreadyInHistory =
                    this.findMessageById(this.messageHistory, realId) !== undefined;
                if (alreadyInHistory) {
                    await this.unsentMutex.acquire(messagingProductContactId);
                    const list = this.unsentMessages.get(messagingProductContactId);
                    if (list) {
                        const idx = list.findIndex(m => m.id === realId);
                        if (idx !== -1) {
                            list.splice(idx, 1);
                            this.unsentMessages.set(messagingProductContactId, list);
                        }
                    }
                    await this.unsentMutex.release(messagingProductContactId);
                    this.sentAt.delete(realId);
                    this.logger.debug(
                        `[msg-timing] HTTP resolved: fakeId=${fakeId.slice(0, 8)} → realId=${realId.slice(0, 8)} elapsed=${httpMs}ms — cleaned up stale unsent entry (WS already in history)`,
                    );
                } else {
                    this.logger.debug(
                        `[msg-timing] HTTP resolved: fakeId=${fakeId.slice(0, 8)} → realId=${realId.slice(0, 8)} elapsed=${httpMs}ms`,
                    );
                }
                return;
            } else {
                this.sentAt.delete(fakeId);
                this.logger.debug(
                    `[msg-timing] HTTP resolved: fakeId=${fakeId.slice(0, 8)} elapsed=${httpMs}ms — WS already removed it via fallback`,
                );
            }
            await this.messageMutex.release(fakeId);
        });
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
