import { Injectable, inject } from "@angular/core";
import { Campaign, CampaignFields } from "../entity/campaign.entity";
import { Query } from "../model/query.model";
import { CampaignControllerService } from "../controller/campaign-controller.service";
import { DateOrderEnum } from "../../common/model/date-order.model";
import { NGXLogger } from "ngx-logger";
import { WorkspaceStoreService } from "../../workspace/store/workspace-store.service";

@Injectable({
    providedIn: "root",
})
export class CampaignStoreService {
    private campaignController = inject(CampaignControllerService);
    private logger = inject(NGXLogger);
    private workspaceStore = inject(WorkspaceStoreService);

    private paginationLimit = 15;

    public reachedMaxLimit = false;
    public reachedMaxSearchLimit = false;
    currentCampaign!: Campaign;

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.campaigns = [];
            this.searchCampaigns = [];
            this.campaignsById.clear();
            this.reachedMaxLimit = false;
            this.reachedMaxSearchLimit = false;
            this.searchValue = "";
        });
    }

    searchMode = "name" as const;

    searchValue = "";
    searchFilters: {
        text: string;
        query?: Query;
    }[] = [];

    campaigns: CampaignFields[] = [];
    searchCampaigns: CampaignFields[] = [];
    campaignsById = new Map<string, CampaignFields>();

    public isExecuting = false;
    public pendingExecution = false;

    async get(): Promise<void> {
        const campaigns = await this.campaignController.get(
            undefined,
            {
                limit: this.paginationLimit,
                offset: this.campaigns.length,
            },
            { created_at: DateOrderEnum.desc },
        );

        if (!campaigns.length) {
            this.reachedMaxLimit = true;
            return;
        }

        this.add(campaigns);
    }

    add(campaigns: CampaignFields[]) {
        this.addCampaignsToCampaignsById(campaigns);
        this.campaigns = [...this.campaigns, ...campaigns];
    }

    addSearch(campaigns: CampaignFields[]) {
        this.addCampaignsToCampaignsById(campaigns);
        this.searchCampaigns = [...this.searchCampaigns, ...campaigns];
    }

    getInitialSearchConcurrent() {
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
                this.logger.error("Error in getInitialSearchConcurrent:", error);
                this.isExecuting = false;

                // Even if there's an error, check for pending execution
                if (this.pendingExecution) {
                    this.pendingExecution = false;
                    this.getInitialSearchConcurrent();
                }
            });
    }

    async getInitialSearch(): Promise<void> {
        this.searchCampaigns = [];

        const campaigns = await this.campaignController.contentLike(
            `%${this.searchValue}%`,
            this.searchMode,
            this.searchFilters.reduce((acc, filter) => {
                return { ...acc, ...filter.query };
            }, {}),
            {
                limit: this.paginationLimit,
                offset: this.searchCampaigns.length,
            },
            { created_at: DateOrderEnum.desc },
        );

        if (!campaigns.length) {
            this.reachedMaxSearchLimit = true;
            return;
        }

        this.addSearch(campaigns);
    }

    async getSearch(): Promise<void> {
        const campaigns = await this.campaignController.contentLike(
            `%${this.searchValue}%`,
            "url",
            this.searchFilters.reduce((acc, filter) => {
                return { ...acc, ...filter.query };
            }, {}),
            {
                limit: this.paginationLimit,
                offset: this.searchCampaigns.length,
            },
            { created_at: DateOrderEnum.desc },
        );

        if (!campaigns.length) {
            this.reachedMaxSearchLimit = true;
            return;
        }

        this.addSearch(campaigns);
    }

    async addFilter(filter: { text: string; query?: Query }) {
        this.searchFilters.push(filter);
        await this.getInitialSearch();
    }

    async removeFilter(filter: { text: string; query?: Query }) {
        this.searchFilters = this.searchFilters.filter(
            searchFilter => searchFilter.text !== filter.text,
        );
        await this.getInitialSearch();
    }

    async addCampaignsToCampaignsById(campaigns: CampaignFields[]) {
        campaigns.forEach(u => {
            this.campaignsById.set(u.id, u);
        });
    }

    async getById(id: string): Promise<CampaignFields> {
        const campaign = this.campaignsById.get(id);
        if (campaign) return campaign;
        const newCampaign = (await this.campaignController.get({ id: id }))[0];
        this.campaignsById.set(id, newCampaign);
        return newCampaign;
    }
}
