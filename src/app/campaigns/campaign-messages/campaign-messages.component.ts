import { CommonModule } from "@angular/common";
import { Component, ElementRef, ViewChild, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { SmallButtonComponent } from "../../common/small-button/small-button.component";
import { CampaignMessage } from "../../../core/campaign/entity/campaign-message.entity";
import { DateOrder, DateOrderEnum } from "../../../core/common/model/date-order.model";
import { CampaignMessageControllerService } from "../../../core/campaign/controller/campaign-message-controller.service";
import { CampaignMessageSendErrorControllerService } from "../../../core/campaign/controller/campaign-message-send-error-controller.service";
import { ActivatedRoute } from "@angular/router";
import { Paginate } from "../../../core/common/model/paginate.model";
import { WhereDate } from "../../../core/common/model/where-date.model";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { CampaignMessageSendError } from "../../../core/campaign/entity/campaign-message-send-error.model";
import { NGXLogger } from "ngx-logger";
import { JsonViewerComponent } from "../../common/json-viewer/json-viewer.component";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-campaign-messages",
    imports: [
        CommonModule,
        FormsModule,
        SmallButtonComponent,
        TimeoutErrorModalComponent,
        JsonViewerComponent,
    ],
    templateUrl: "./campaign-messages.component.html",
    styleUrl: "./campaign-messages.component.scss",
    standalone: true,
})
export class CampaignMessagesComponent implements OnInit {
    private campaignMessagesController = inject(CampaignMessageControllerService);
    private messageSendErrorController = inject(CampaignMessageSendErrorControllerService);
    private route = inject(ActivatedRoute);
    private logger = inject(NGXLogger);

    DateOrderEnum = DateOrderEnum; // For template access

    @ViewChild("scrollAnchor", { static: false }) scrollAnchor!: ElementRef;
    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    campaignId?: string;
    messages: CampaignMessage[] = [];
    errors: Record<string, CampaignMessageSendError[]> = {};
    isLoadingError: Record<string, boolean> = {};
    limit = 20;
    isLoading = false;
    reachedEnd = false;
    expandedMessageIndex: number | null = null; // Tracks the expanded message
    getPromise: Promise<void> = Promise.resolve();

    // Filters
    id?: string;
    createdAtGte?: string;
    createdAtLte?: string;
    dateOrder: DateOrderEnum = DateOrderEnum.desc;
    messageState: "all" | "sent" | "unsent" = "all";

    async ngOnInit(): Promise<void> {
        this.watchQueryParams();
        await this.getPromise.then(() => {
            this.getPromise = this.loadMessages();
        });
    }

    // Toggle expand/collapse of a specific message entry and load errors if expanding
    async toggleExpand(index: number): Promise<void> {
        const message = this.messages[index];
        const messageId = message.id;

        if (this.expandedMessageIndex === index) {
            this.expandedMessageIndex = null;
            return;
        }

        this.expandedMessageIndex = index;
        if (this.errors[messageId] || this.isLoadingError[messageId]) return;

        this.isLoadingError[messageId] = true;
        try {
            const query = { campaign_message_id: messageId };
            const errors = await this.messageSendErrorController.get(query);
            this.errors[messageId] = errors;
        } catch (error) {
            this.handleErr("Error loading message errors", error);
        } finally {
            this.isLoadingError[messageId] = false;
        }
    }

    // Load messages with infinite scroll and filters
    async loadMessages(): Promise<void> {
        if (this.isLoading || this.reachedEnd) return;

        this.isLoading = true;

        try {
            const query = {
                campaign_id: this.campaignId,
                id: this.id,
            };
            const pagination: Paginate = {
                limit: this.limit,
                offset: this.messages.length,
            };
            const order: DateOrder = { created_at: this.dateOrder };
            const whereDate: WhereDate = {
                created_at_geq: this.createdAtGte ? new Date(this.createdAtGte) : undefined,
                created_at_leq: this.createdAtLte ? new Date(this.createdAtLte) : undefined,
            };

            let newMessages: CampaignMessage[] = [];
            switch (this.messageState) {
                case "all":
                    newMessages = await this.campaignMessagesController.get(
                        query,
                        pagination,
                        order,
                        whereDate,
                    );
                    break;
                case "sent":
                    newMessages = await this.campaignMessagesController.getSent(
                        query,
                        pagination,
                        order,
                        whereDate,
                    );
                    break;
                case "unsent":
                    newMessages = await this.campaignMessagesController.getUnsent(
                        query,
                        pagination,
                        order,
                        whereDate,
                    );
                    break;
            }
            if (newMessages.length < this.limit) {
                this.reachedEnd = true;
            }

            this.messages = [...this.messages, ...newMessages];
        } catch (error) {
            this.handleErr("Error loading messages", error);
        } finally {
            this.isLoading = false;
        }
    }

    // Apply filters and reset the messages list
    async applyFilters(): Promise<void> {
        this.messages = [];
        this.reachedEnd = false;
        await this.loadMessages();
    }

    watchQueryParams() {
        this.route.queryParams.subscribe(async params => {
            const campaignId = params["campaign.id"];
            if (campaignId !== this.campaignId) {
                this.campaignId = campaignId;
                this.messages = [];
                this.reachedEnd = false;
                await this.loadMessages();
            }
        });
    }

    // Clear all filter inputs
    clearFilters(): void {
        this.id = undefined;
        this.createdAtGte = undefined;
        this.createdAtLte = undefined;
        this.dateOrder = DateOrderEnum.desc;

        this.applyFilters();
    }

    onScroll(event: Event): void {
        const element = event.target as HTMLElement;
        if (
            !(element.scrollHeight - element.scrollTop <= element.clientHeight + 100) ||
            this.isLoading
        )
            return;

        this.getPromise.then(() => {
            this.getPromise = this.loadMessages();
        });
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

    async deleteMessage(id: string, index: number): Promise<void> {
        const confirmed = window.confirm("Are you sure you want to delete this message?");
        if (!confirmed) return;

        try {
            await this.campaignMessagesController.delete(id);
            this.messages.splice(index, 1);
        } catch (error) {
            this.handleErr("Error deleting message", error);
        }
    }
}
