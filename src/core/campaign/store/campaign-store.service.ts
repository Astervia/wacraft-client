import { Injectable, inject } from "@angular/core";
import { Campaign, CampaignFields } from "../entity/campaign.entity";
import { Query } from "../model/query.model";
import { CampaignControllerService } from "../controller/campaign-controller.service";
import { DateOrderEnum } from "../../common/model/date-order.model";
import { NGXLogger } from "ngx-logger";
import { WorkspaceStoreService } from "../../workspace/store/workspace-store.service";
import { MutexSwapper } from "../../synch/mutex-swapper/mutex-swapper";

@Injectable({
    providedIn: "root",
})
export class CampaignStoreService {
    private campaignController = inject(CampaignControllerService);
    private logger = inject(NGXLogger);
    private workspaceStore = inject(WorkspaceStoreService);
    private listMutex = new MutexSwapper<string>();
    private readonly listMutexKey = "campaigns";

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

    private async withListLock<T>(fn: () => Promise<T>): Promise<T> {
        await this.listMutex.acquire(this.listMutexKey);
        try {
            return await fn();
        } finally {
            await this.listMutex.release(this.listMutexKey);
        }
    }

    async get(): Promise<void> {
        await this.withListLock(async () => {
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

            this.addUnsafe(campaigns);
        });
    }

    add(campaigns: CampaignFields[]) {
        void this.withListLock(async () => {
            this.addUnsafe(campaigns);
        });
    }

    addSearch(campaigns: CampaignFields[]) {
        void this.withListLock(async () => {
            this.addSearchUnsafe(campaigns);
        });
    }

    private addUnsafe(campaigns: CampaignFields[]) {
        this.addCampaignsToCampaignsById(campaigns);
        this.campaigns = [...this.campaigns, ...campaigns];
    }

    private addSearchUnsafe(campaigns: CampaignFields[]) {
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
        await this.withListLock(async () => {
            this.searchCampaigns = [];
            this.reachedMaxSearchLimit = false;

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

            this.addSearchUnsafe(campaigns);
        });
    }

    async getSearch(): Promise<void> {
        await this.withListLock(async () => {
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

            this.addSearchUnsafe(campaigns);
        });
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

    private matchesCurrentSearch(campaign: CampaignFields): boolean {
        if (!this.searchValue || this.searchFilters.length > 0) return false;

        return campaign.name.toLowerCase().includes(this.searchValue.toLowerCase());
    }

    async prependCampaign(campaign: CampaignFields): Promise<void> {
        await this.withListLock(async () => {
            this.campaignsById.set(campaign.id, campaign);
            this.campaigns = [
                campaign,
                ...this.campaigns.filter(current => current.id !== campaign.id),
            ];

            if (this.matchesCurrentSearch(campaign)) {
                this.searchCampaigns = [
                    campaign,
                    ...this.searchCampaigns.filter(current => current.id !== campaign.id),
                ];
            }
        });
    }

    async updateCampaignById(campaign: CampaignFields): Promise<void> {
        await this.withListLock(async () => {
            this.campaignsById.set(campaign.id, campaign);
            this.campaigns = this.campaigns.map(current =>
                current.id === campaign.id ? campaign : current,
            );

            const searchIndex = this.searchCampaigns.findIndex(
                current => current.id === campaign.id,
            );
            if (searchIndex !== -1) {
                this.searchCampaigns = this.searchCampaigns.map(current =>
                    current.id === campaign.id ? campaign : current,
                );
            } else if (this.matchesCurrentSearch(campaign)) {
                this.searchCampaigns = [campaign, ...this.searchCampaigns];
            }
        });
    }

    async removeCampaign(id: string): Promise<void> {
        await this.withListLock(async () => {
            this.campaignsById.delete(id);
            this.campaigns = this.campaigns.filter(campaign => campaign.id !== id);
            this.searchCampaigns = this.searchCampaigns.filter(campaign => campaign.id !== id);
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
