import { Injectable, inject } from "@angular/core";
import { WebhookControllerService } from "../controller/webhook-controller.service";
import { Webhook } from "../entity/webhook.entity";
import { Query } from "../model/query.model";
import { DateOrderEnum } from "../../common/model/date-order.model";
import { NGXLogger } from "ngx-logger";
import { WorkspaceStoreService } from "../../workspace/store/workspace-store.service";
import { Mutex } from "async-mutex";

@Injectable({
    providedIn: "root",
})
export class WebhookStoreService {
    private webhookController = inject(WebhookControllerService);
    private logger = inject(NGXLogger);
    private workspaceStore = inject(WorkspaceStoreService);
    private listMutex = new Mutex();

    private paginationLimit = 15;

    public reachedMaxLimit = false;
    public reachedMaxSearchLimit = false;
    currentWebhook!: Webhook;

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.webhooks = [];
            this.searchWebhooks = [];
            this.webhooksById.clear();
            this.reachedMaxLimit = false;
            this.reachedMaxSearchLimit = false;
            this.searchValue = "";
        });
    }

    searchMode: "url" | "http_method" | "event" = "url";

    searchValue = "";
    searchFilters: {
        text: string;
        query?: Query;
    }[] = [];

    webhooks: Webhook[] = [];
    searchWebhooks: Webhook[] = [];
    webhooksById = new Map<string, Webhook>();

    public isExecuting = false;
    public pendingExecution = false;

    private async withListLock<T>(fn: () => Promise<T>): Promise<T> {
        await this.listMutex.acquire();
        try {
            return await fn();
        } finally {
            this.listMutex.release();
        }
    }

    async get(): Promise<void> {
        await this.withListLock(async () => {
            const webhooks = await this.webhookController.get(
                undefined,
                {
                    limit: this.paginationLimit,
                    offset: this.webhooks.length,
                },
                { created_at: DateOrderEnum.desc },
            );

            if (!webhooks.length) {
                this.reachedMaxLimit = true;
                return;
            }

            this.addUnsafe(webhooks);
        });
    }

    add(webhooks: Webhook[]) {
        void this.withListLock(async () => {
            this.addUnsafe(webhooks);
        });
    }

    addSearch(webhooks: Webhook[]) {
        void this.withListLock(async () => {
            this.addSearchUnsafe(webhooks);
        });
    }

    private addUnsafe(webhooks: Webhook[]) {
        this.addWebhooksToWebhooksById(webhooks);
        this.webhooks = [...this.webhooks, ...webhooks];
    }

    private addSearchUnsafe(webhooks: Webhook[]) {
        this.addWebhooksToWebhooksById(webhooks);
        this.searchWebhooks = [...this.searchWebhooks, ...webhooks];
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
            this.searchWebhooks = [];
            this.reachedMaxSearchLimit = false;

            const webhooks = await this.webhookController.contentLike(
                `%${this.searchValue}%`,
                this.searchMode,
                this.searchFilters.reduce((acc, filter) => {
                    return { ...acc, ...filter.query };
                }, {}),
                {
                    limit: this.paginationLimit,
                    offset: this.searchWebhooks.length,
                },
                { created_at: DateOrderEnum.desc },
            );

            if (!webhooks.length) {
                this.reachedMaxSearchLimit = true;
                return;
            }

            this.addSearchUnsafe(webhooks);
        });
    }

    async getSearch(): Promise<void> {
        await this.withListLock(async () => {
            const webhooks = await this.webhookController.contentLike(
                `%${this.searchValue}%`,
                "url",
                this.searchFilters.reduce((acc, filter) => {
                    return { ...acc, ...filter.query };
                }, {}),
                {
                    limit: this.paginationLimit,
                    offset: this.searchWebhooks.length,
                },
                { created_at: DateOrderEnum.desc },
            );

            if (!webhooks.length) {
                this.reachedMaxSearchLimit = true;
                return;
            }

            this.addSearchUnsafe(webhooks);
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

    async addWebhooksToWebhooksById(webhooks: Webhook[]) {
        webhooks.forEach(u => {
            this.webhooksById.set(u.id, u);
        });
    }

    private matchesCurrentSearch(webhook: Webhook): boolean {
        if (!this.searchValue || this.searchFilters.length > 0) return false;

        const searchValue = this.searchValue.toLowerCase();
        switch (this.searchMode) {
            case "url":
                return webhook.url.toLowerCase().includes(searchValue);
            case "http_method":
                return webhook.http_method.toLowerCase().includes(searchValue);
            case "event":
                return webhook.event.toLowerCase().includes(searchValue);
        }
    }

    async prependWebhook(webhook: Webhook): Promise<void> {
        await this.withListLock(async () => {
            this.webhooksById.set(webhook.id, webhook);
            this.webhooks = [
                webhook,
                ...this.webhooks.filter(current => current.id !== webhook.id),
            ];

            if (this.matchesCurrentSearch(webhook)) {
                this.searchWebhooks = [
                    webhook,
                    ...this.searchWebhooks.filter(current => current.id !== webhook.id),
                ];
            }
        });
    }

    async syncWebhook(webhook: Webhook): Promise<void> {
        await this.withListLock(async () => {
            this.webhooksById.set(webhook.id, webhook);
            this.webhooks = this.webhooks.map(current =>
                current.id === webhook.id ? webhook : current,
            );

            const searchIndex = this.searchWebhooks.findIndex(current => current.id === webhook.id);
            if (searchIndex !== -1) {
                this.searchWebhooks = this.searchWebhooks.map(current =>
                    current.id === webhook.id ? webhook : current,
                );
            } else if (this.matchesCurrentSearch(webhook)) {
                this.searchWebhooks = [webhook, ...this.searchWebhooks];
            }
        });
    }

    async removeWebhook(id: string): Promise<void> {
        await this.withListLock(async () => {
            this.webhooksById.delete(id);
            this.webhooks = this.webhooks.filter(webhook => webhook.id !== id);
            this.searchWebhooks = this.searchWebhooks.filter(webhook => webhook.id !== id);
        });
    }

    async getById(id: string): Promise<Webhook> {
        const webhook = this.webhooksById.get(id);
        if (webhook) return webhook;
        const newWebhook = (await this.webhookController.get({ id: id }))[0];
        this.webhooksById.set(id, newWebhook);
        return newWebhook;
    }
}
