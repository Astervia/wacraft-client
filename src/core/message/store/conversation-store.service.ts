import { Injectable, inject } from "@angular/core";
import { ConversationControllerService } from "../controller/conversation-controller.service";
import { Query } from "../model/query.model";
import { ConversationWithUnread } from "../../../app/chats-sidebar/model/conversation-with-unread.model";
import { MessageGatewayService } from "../gateway/message-gateway.service";
import { LocalSettingsService } from "../../../app/local-settings.service";
import { Conversation } from "../model/conversation.model";
import { MessagingProductContactFromMessagePipe } from "../pipe/messaging-product-contact-from-message.pipe";
import { MessagingProductContactControllerService } from "../../messaging-product/controller/messaging-product-contact-controller.service";
import { UnreadMode } from "../../local-config/model/unread-mode.model";
import { DateOrderEnum } from "../../common/model/date-order.model";
import { MessageControllerService } from "../controller/message-controller.service";
import { MessageType } from "../model/message-type.model";
import { ActivatedRoute } from "@angular/router";
import { StatusGatewayService } from "../../status/gateway/status-gateway.service";
import { statusOrder } from "../../status/constant/status-order.constant";
import { Status } from "../../status/entity/status.entity";
import { NGXLogger } from "ngx-logger";
import { WorkspaceStoreService } from "../../workspace/store/workspace-store.service";

@Injectable({
    providedIn: "root",
})
export class ConversationStoreService {
    private messageController = inject(MessageControllerService);
    private conversationController = inject(ConversationControllerService);
    private messagingProductPipe = inject(MessagingProductContactFromMessagePipe);
    private messageGateway = inject(MessageGatewayService);
    private statusGateway = inject(StatusGatewayService);
    private localSettings = inject(LocalSettingsService);
    private messagingProductContactController = inject(MessagingProductContactControllerService);
    private workspaceStore = inject(WorkspaceStoreService);
    private logger = inject(NGXLogger);

    // Handles queries, loading, filters and stuff related to data
    public isExecuting = false;
    public pendingExecution = false;
    private paginationLimit = 30;
    public reachedMaxConversationLimit = false;
    public reachedMaxSearchConversationLimit = false;
    public count = 0;
    public searchCount = 0;
    searchValue = "";

    messagingProductContactIdFilter?: string;
    conversations: ConversationWithUnread[] = [];
    searchConversations: Conversation[] = [];
    searchMode: "contact" | "message" = "message";

    searchFilters: {
        text: string;
        query?: Query;
    }[] = [];

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.resetState();
        });
    }

    resetState(): void {
        this.conversations = [];
        this.searchConversations = [];
        this.reachedMaxConversationLimit = false;
        this.reachedMaxSearchConversationLimit = false;
        this.count = 0;
        this.searchCount = 0;
        this.searchValue = "";
        this.initPromise = null;
    }

    private initPromise: Promise<void> | null = null;
    public initConditionally(route: ActivatedRoute): Promise<void> {
        // If we have already started (or finished) initializing, just reuse that.
        if (!this.initPromise) this.initPromise = this.init(route);

        return this.initPromise;
    }
    private async init(route: ActivatedRoute): Promise<void> {
        await Promise.all([
            this.messageGateway.watchNewMessage(message => {
                this.unshiftConversation(message);

                // Check for "read" condition
                const selectedId = route.snapshot.queryParams["messaging_product_contact.id"];
                if (selectedId && selectedId === this.messagingProductPipe.transform(message).id)
                    this.read(selectedId);
            }),
            this.messageGateway.opened,
            this.statusGateway.opened.then(() => {
                this.statusGateway.watchNewStatus((data: Status) => {
                    const messageId = data.message_id;
                    const message = this.conversations.find(
                        value => value.message.id === messageId,
                    )?.message;
                    if (!message) return;

                    if (!message.statuses) message.statuses = [];

                    const currentStatus = message.statuses[0]?.product_data?.status;
                    if (
                        message.statuses.length === 0 ||
                        !data.product_data.status ||
                        !currentStatus
                    )
                        return message.statuses.unshift(data);

                    const currentOrder = statusOrder.get(currentStatus) || 0;
                    const incommingOrder = statusOrder.get(data.product_data.status) || 0;
                    if (incommingOrder < currentOrder) return message.statuses.unshift(data);
                    return message.statuses.push(data);
                });
            }),
        ]);

        // Fetch initial data
        await this.get();
    }

    async unshiftConversation(message: Conversation) {
        const conversation = new ConversationWithUnread(message);
        // Check for conversation id in the array and remove if found
        const existingIndex = this.conversations.findIndex(
            conv =>
                this.messagingProductPipe.transform(conversation.message).id ===
                this.messagingProductPipe.transform(conv.message).id,
        );
        if (existingIndex !== -1) {
            const currentConversation = this.conversations[existingIndex];
            this.conversations.splice(existingIndex, 1);
            conversation.replaceUnread(currentConversation.unread);
            if (
                this.localSettings.unreadMode === UnreadMode.LOCAL ||
                this.localSettings.unreadMode === UnreadMode.SERVER
            )
                conversation.increaseUnread();
        } else if (
            this.localSettings.unreadMode === UnreadMode.SERVER &&
            conversation.message.created_at >
                this.messagingProductPipe.transform(conversation.message).last_read_at
        ) {
            const count = await this.messageController.count(
                {
                    from_id: this.messagingProductPipe.transform(conversation.message).id,
                },
                undefined,
                {
                    created_at_geq: this.messagingProductPipe.transform(conversation.message)
                        .last_read_at,
                },
            );
            conversation.unread = count;
        }

        // Then add the conversation to the beginning of the array
        this.conversations.unshift(conversation);
    }

    async get(): Promise<void> {
        const [conversations] = await Promise.all([
            this.conversationController.get(
                undefined,
                {
                    limit: this.paginationLimit,
                    offset: this.conversations.length,
                },
                { created_at: DateOrderEnum.desc },
            ),
            this.countConversations(),
        ]);

        if (!conversations.length) {
            this.reachedMaxConversationLimit = true;
            return;
        }

        this.add(conversations);
    }

    read(messagingProductContactId: string) {
        const conversation = this.conversations.find(
            conversation =>
                this.messagingProductPipe.transform(conversation.message).id ===
                messagingProductContactId,
        );
        if (!conversation) return;
        if (this.localSettings.unreadMode === UnreadMode.SERVER)
            this.messagingProductContactController.updateLastReadAt(
                this.messagingProductPipe.transform(conversation.message).id,
            );
        conversation.resetUnread();
    }

    async add(conversations: Conversation[]) {
        this.conversations = [
            ...this.conversations,
            ...(await Promise.all(
                conversations.map(async conversation => {
                    const withUnread = new ConversationWithUnread(conversation);
                    if (
                        this.localSettings.unreadMode === UnreadMode.SERVER &&
                        conversation.created_at >
                            this.messagingProductPipe.transform(conversation).last_read_at
                    ) {
                        const count = await this.messageController.count(
                            {
                                from_id: this.messagingProductPipe.transform(conversation).id,
                            },
                            undefined,
                            {
                                created_at_geq:
                                    this.messagingProductPipe.transform(conversation).last_read_at,
                            },
                        );
                        withUnread.unread = count;
                    }
                    return withUnread;
                }),
            )),
        ];
    }

    addSearch(conversations: Conversation[]) {
        this.searchConversations = [...this.searchConversations, ...conversations];
    }

    async getSearchConversations(): Promise<void> {
        const [conversations] = await Promise.all([
            this.messagingProductContactIdFilter
                ? await this.conversationController.conversationContentLike(
                      this.messagingProductContactIdFilter,
                      `%${this.searchValue}%`,
                      this.searchFilters.reduce((acc, filter) => {
                          return { ...acc, ...filter.query };
                      }, {}),
                      {
                          limit: this.paginationLimit,
                          offset: this.searchConversations.length,
                      },
                      { created_at: DateOrderEnum.desc },
                  )
                : await this.messageController.contentLike(
                      `%${this.searchValue}%`,
                      this.searchFilters.reduce((acc, filter) => {
                          return { ...acc, ...filter.query };
                      }, {}),
                      {
                          limit: this.paginationLimit,
                          offset: this.searchConversations.length,
                      },
                      { created_at: DateOrderEnum.desc },
                  ),
            this.countSearchConversations(),
        ]);

        if (!conversations.length) {
            this.reachedMaxSearchConversationLimit = true;
            return;
        }

        this.addSearch(conversations);
    }

    async getInitialSearch(): Promise<void> {
        this.searchConversations = [];

        const [conversations] = await Promise.all([
            this.searchMode === "message"
                ? this.messagingProductContactIdFilter
                    ? await this.conversationController.conversationContentLike(
                          this.messagingProductContactIdFilter,
                          `%${this.searchValue}%`,
                          this.searchFilters.reduce((acc, filter) => {
                              return { ...acc, ...filter.query };
                          }, {}),
                          {
                              limit: this.paginationLimit,
                              offset: this.searchConversations.length,
                          },
                          { created_at: DateOrderEnum.desc },
                      )
                    : await this.messageController.contentLike(
                          `%${this.searchValue}%`,
                          this.searchFilters.reduce((acc, filter) => {
                              return { ...acc, ...filter.query };
                          }, {}),
                          {
                              limit: this.paginationLimit,
                              offset: this.searchConversations.length,
                          },
                          { created_at: DateOrderEnum.desc },
                      )
                : (
                      await this.messagingProductContactController.getLikeText(
                          `%${this.searchValue}%`,
                          {
                              id: this.messagingProductContactIdFilter,
                          },
                          {
                              limit: this.paginationLimit,
                              offset: this.searchConversations.length,
                          },
                          { created_at: DateOrderEnum.desc },
                      )
                  ).map(contact => {
                      return {
                          sender_data: {
                              recipient_type: "",
                              messaging_product: "whatsapp",
                              to: contact.product_details.phone_number,
                              type: MessageType.text,
                              text: { preview_url: false, body: "" },
                          },
                          from_id: "",
                          to_id: contact.id,
                          messaging_product_id: contact.messaging_product_id,
                          to: contact,
                          id: "",
                          created_at: new Date(),
                          updated_at: new Date(),
                      };
                  }),
            this.countSearchConversations(),
        ]);

        if (!conversations.length) {
            this.reachedMaxSearchConversationLimit = true;
            return;
        }

        this.addSearch(conversations);
    }

    async countConversations() {
        this.count = await this.conversationController.count(undefined, {});
    }

    async countSearchConversations() {
        this.searchCount =
            this.searchMode === "message"
                ? this.messagingProductContactIdFilter
                    ? await this.conversationController.countConversationContentLike(
                          this.messagingProductContactIdFilter,
                          `%${this.searchValue}%`,
                          this.searchFilters.reduce((acc, filter) => {
                              return { ...acc, ...filter.query };
                          }, {}),
                          {
                              limit: this.paginationLimit,
                              offset: this.searchConversations.length,
                          },
                      )
                    : await this.messageController.countContentLike(
                          `%${this.searchValue}%`,
                          this.searchFilters.reduce((acc, filter) => {
                              return { ...acc, ...filter.query };
                          }, {}),
                      )
                : await this.messagingProductContactController.countLikeText(
                      `%${this.searchValue}%`,
                      {
                          id: this.messagingProductContactIdFilter,
                      },
                  );
    }

    async addFilter(
        filter: { text: string; query?: Query },
        messagingProductContactIdFilter?: string,
    ) {
        this.searchFilters.push(filter);
        if (messagingProductContactIdFilter)
            this.messagingProductContactIdFilter = messagingProductContactIdFilter;
        this.getInitialSearchConcurrent();
    }

    getInitialSearchConcurrent(): void {
        if (!this.searchValue) return;

        if (this.isExecuting) {
            // If an execution is already in progress, mark that another execution is pending
            if (!this.pendingExecution) this.pendingExecution = true;
            // Do nothing else to prevent multiple queues
            return;
        }

        // No execution is in progress, so start one
        this.isExecuting = true;

        this.getInitialSearch()
            .then(() => {
                // Execution finished
                this.isExecuting = false;

                // If there's a pending execution, reset the flag and execute again
                if (this.pendingExecution) {
                    this.pendingExecution = false;
                    this.getInitialSearchConcurrent();
                }
            })
            .catch(error => {
                // Handle errors if necessary
                this.logger.error("Error in getInitialSearchConversations:", error);
                this.isExecuting = false;

                // Even if there's an error, check for pending execution
                if (this.pendingExecution) {
                    this.pendingExecution = false;
                    this.getInitialSearchConcurrent();
                }
            });
    }

    async removeFilter(filter: { text: string; query?: Query }) {
        this.searchFilters = this.searchFilters.filter(
            searchFilter => searchFilter.text !== filter.text,
        );
        this.messagingProductContactIdFilter = undefined;
        this.getInitialSearchConcurrent();
    }
}
