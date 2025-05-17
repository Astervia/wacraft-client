import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { CampaignMessagesComponent } from "../campaign-messages/campaign-messages.component";
import { CampaignMessageBuilderComponent } from "../campaign-message-builder/campaign-message-builder.component";
import { MatIconModule } from "@angular/material/icon";
import { SendCampaignComponent } from "../send-campaign/send-campaign.component";
import { CampaignFields } from "../../../core/campaign/entity/campaign.entity";
import { CampaignControllerService } from "../../../core/campaign/controller/campaign-controller.service";
import { CampaignStoreService } from "../../../core/campaign/store/campaign-store.service";
import { CampaignMessageControllerService } from "../../../core/campaign/controller/campaign-message-controller.service";
import { MessagingProductControllerService } from "../../../core/messaging-product/controller/messaging-product-controller.service";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";
import { NGXLogger } from "ngx-logger";
import { MatTooltipModule } from "@angular/material/tooltip";

@Component({
    selector: "app-campaign-details",
    imports: [
        FormsModule,
        CommonModule,
        CampaignMessagesComponent,
        CampaignMessageBuilderComponent,
        SendCampaignComponent,
        MatIconModule,
        MatTooltipModule,
    ],
    templateUrl: "./campaign-details.component.html",
    styleUrl: "./campaign-details.component.scss",
    preserveWhitespaces: false,
    standalone: true,
})
export class CampaignDetailsComponent {
    Event = Event;

    campaign!: CampaignFields;
    campaignId?: string;
    totalMessages: number = 0;
    unsentMessages: number = 0;
    messagesSent: number = 0;

    isEditing = false;

    constructor(
        private campaignController: CampaignControllerService,
        private campaignStore: CampaignStoreService,
        private messageController: CampaignMessageControllerService,
        private messagingProductController: MessagingProductControllerService,
        private queryParamsService: QueryParamsService,
        private route: ActivatedRoute,
        private router: Router,
        private logger: NGXLogger,
    ) {}

    ngOnInit(): void {
        this.watchQueryParams();
    }

    async saveChanges() {
        if (this.campaign)
            try {
                if (!this.campaignId) {
                    const messagingProduct = (
                        await this.messagingProductController.get({
                            name: "WhatsApp",
                        })
                    )[0];
                    const campaign = await this.campaignController.create({
                        name: this.campaign.name,
                        messaging_product_id: messagingProduct.id,
                    });
                    await this.router.navigate([], {
                        queryParams: {
                            "campaign.id": campaign.id,
                            ...this.queryParamsService.globalQueryParams,
                        },
                        preserveFragment: true,
                        queryParamsHandling: "replace",
                    });
                    window.location.reload();
                    return;
                }
                await this.campaignController.update({
                    id: this.campaignId,
                    name: this.campaign.name,
                });
                this.isEditing = false;
                return;
            } catch (error) {
                this.logger.error("Error updating campaign", error);
            }
    }

    watchQueryParams() {
        this.route.queryParams.subscribe(async (params) => {
            const campaignId = params["campaign.id"];
            if (campaignId == this.campaignId) return await this.loadCampaign();
            this.campaignId = campaignId;
            return await Promise.all([
                this.loadMessageCount(),
                this.loadCampaign(),
            ]);
        });
    }

    async loadCampaignDataAndStatuses() {
        return await Promise.all([
            this.loadMessageCount(),
            this.loadCampaign(),
        ]);
    }

    async loadCampaign() {
        if (!this.campaignId) {
            this.campaign = {
                id: "",
                name: "",
                messaging_product_id: "",
                created_at: new Date(),
                updated_at: new Date(),
            };
            this.isEditing = true;
            return;
        }
        this.isEditing = false;
        this.campaign = await this.campaignStore.getById(this.campaignId);
    }

    toggleEdit() {
        this.isEditing = !this.isEditing;
    }

    cancelEdit() {
        if (!this.campaignId) {
            this.campaign = {
                id: "",
                name: "",
                messaging_product_id: "",
                created_at: new Date(),
                updated_at: new Date(),
            };
            this.isEditing = true;
            return;
        }
        this.isEditing = false;
        this.loadCampaign();
    }

    async delete() {
        if (!this.campaignId) return;

        // Show confirmation alert
        const confirmed = window.confirm(
            "Are you sure you want to delete this campaign? This action cannot be undone.",
        );

        // If the user confirms, proceed with the deletion
        if (confirmed) {
            try {
                await this.campaignController.delete(this.campaignId);
                await this.resetCampaignId(); // Call to reset or clean up after deletion
                window.location.reload();
            } catch (error) {
                this.logger.error("Error deleting campaign:", error);
            }
        }
    }

    async resetCampaignId() {
        await this.router.navigate([], {
            queryParams: this.queryParamsService.globalQueryParams,
            preserveFragment: true,
            queryParamsHandling: "replace",
        });
    }

    // Copy the given value to the clipboard
    async copyToClipboard(value?: string) {
        if (value) {
            await navigator.clipboard.writeText(value);
        }
    }

    async loadMessageCount() {
        [this.totalMessages, this.messagesSent, this.unsentMessages] =
            await Promise.all([
                this.messageController.count({
                    campaign_id: this.campaignId,
                }),
                this.messageController.countSent({
                    campaign_id: this.campaignId,
                }),
                this.messageController.countUnsent({
                    campaign_id: this.campaignId,
                }),
            ]);
    }
}
