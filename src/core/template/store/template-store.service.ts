import { Injectable, inject } from "@angular/core";
import { TemplateControllerService } from "../controller/template-controller.service";
import { Template, TemplateCategory, TemplateStatus } from "../model/template.model";
import { TemplateQueryParams, TemplateQualityScore } from "../model/template-query-params.model";
import { TemplateSummary } from "../model/template-summary.model";
import { MutexSwapper } from "../../synch/mutex-swapper/mutex-swapper";
import { WorkspaceStoreService } from "../../workspace/store/workspace-store.service";

@Injectable({
    providedIn: "root",
})
export class TemplateStoreService {
    private templateController = inject(TemplateControllerService);
    private workspaceStore = inject(WorkspaceStoreService);

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.templates = [];
            this.searchTemplates = [];
            this.templatesByName.clear();
            this.searchValue = "";
            this.nextAfterTemplate = undefined;
            this.nextAfterTemplateSearch = undefined;
            this.clearAllFilters();
        });
    }

    public searchValue = "";
    private templatesPaginationLimit = 15;
    private nextAfterTemplate?: string;
    private nextAfterTemplateSearch?: string;

    private templateMutexSwapper = new MutexSwapper<string>();

    public searchMode: "name" | "category" | "language" | "content" = "name";

    public searchFilters: {
        text: string;
        query?: TemplateQueryParams;
    }[] = [];

    // Enum filters
    public selectedStatuses = new Set<TemplateStatus>();
    public selectedCategories = new Set<TemplateCategory>();
    public selectedQualityScores = new Set<TemplateQualityScore>();

    public templates: Template[] = [];
    public searchTemplates: Template[] = [];

    public isExecuting = false;
    public pendingExecution = false;

    public templatesByName = new Map<string, Template>();

    async getByName(templateName: string): Promise<Template> {
        await this.templateMutexSwapper.acquire(templateName);
        const template = this.templatesByName.get(templateName);
        if (template) {
            await this.templateMutexSwapper.release(templateName);
            return template;
        }
        const newTemplate = await this.findExactTemplateByName(templateName);
        // Old query supposing Meta exact search:
        //
        // (
        //     await this.templateController.get({
        //         name: templateName,
        //         limit: 1,
        //     })
        // ).data[0];
        this.templatesByName.set(templateName, newTemplate);
        await this.templateMutexSwapper.release(templateName);
        return newTemplate;
    }

    async get(): Promise<void> {
        const data = await this.templateController.get({
            limit: this.templatesPaginationLimit,
            after: this.nextAfterTemplate,
            summary: [TemplateSummary.total_count],
        });
        const templates = data.data;
        if (
            !data.summary?.total_count ||
            (data.summary?.total_count && this.templates.length >= data?.summary?.total_count)
        )
            return;
        this.nextAfterTemplate = data.paging.cursors.after;

        await this.addTemplates(templates);
    }

    async addTemplates(templates: Template[]) {
        await this.addTemplatesToTemplatesByName(templates);
        this.templates = [...this.templates, ...templates];
    }

    async getSearchTemplates(): Promise<void> {
        const queryParams = this.buildSearchQueryParams();
        const data = await this.templateController.get({
            ...queryParams,
            limit: this.templatesPaginationLimit,
            after: this.nextAfterTemplateSearch,
            summary: [TemplateSummary.total_count],
        });
        const templates = data.data;
        if (
            !data.summary?.total_count ||
            (data.summary?.total_count && this.searchTemplates.length >= data?.summary?.total_count)
        ) {
            return;
        }

        this.nextAfterTemplateSearch = data.paging.cursors.after;

        await this.addSearchTemplates(templates);
    }

    async addSearchTemplates(templates: Template[]) {
        await this.addTemplatesToTemplatesByName(templates);
        this.searchTemplates = [...this.searchTemplates, ...templates];
    }

    async getInitialSearchTemplates(): Promise<void> {
        this.searchTemplates = [];

        const queryParams = this.buildSearchQueryParams();
        const data = await this.templateController.get({
            ...queryParams,
            limit: this.templatesPaginationLimit,
            summary: [TemplateSummary.total_count],
        });
        const templates = data.data;
        if (
            !data.summary?.total_count ||
            (data.summary?.total_count && this.searchTemplates.length >= data?.summary?.total_count)
        )
            return;
        this.nextAfterTemplateSearch = data.paging.cursors.after;

        await this.addSearchTemplates(templates);
    }

    async addFilter(filter: { text: string; query?: TemplateQueryParams }) {
        this.searchFilters.push(filter);
        await this.getInitialSearchTemplates();
    }

    async removeFilter(filter: { text: string; query?: TemplateQueryParams }) {
        this.searchFilters = this.searchFilters.filter(
            searchFilter => searchFilter.text !== filter.text,
        );
        await this.getInitialSearchTemplates();
    }

    getInitialSearchTemplatesConcurrent() {
        // Only run if there are active filters or search value
        if (!this.hasActiveFilters()) return;

        if (this.isExecuting) {
            // If an execution is already in progress, mark that another execution is pending
            if (!this.pendingExecution) this.pendingExecution = true;
            // Do nothing else to prevent multiple queues
            return;
        }

        // No execution is in progress, so start one
        this.isExecuting = true;

        this.getInitialSearchTemplates()
            .then(() => {
                // Execution finished
                this.isExecuting = false;

                // If there's a pending execution, reset the flag and execute again
                if (this.pendingExecution) {
                    this.pendingExecution = false;
                    this.getInitialSearchTemplatesConcurrent();
                }
            })
            .catch(error => {
                console.error("Error getting initial search templates", error);
                this.isExecuting = false;

                // Even if there's an error, check for pending execution
                if (this.pendingExecution) {
                    this.pendingExecution = false;
                    this.getInitialSearchTemplatesConcurrent();
                }
            });
    }

    private buildSearchQueryParams(): Partial<TemplateQueryParams> {
        const params: {
            status?: string;
            category?: string;
            quality_score?: string;
            name?: string;
            content?: string;
            language?: string;
        } = {};

        // Add text search if exists
        if (this.searchValue) {
            if (this.searchMode === "name") {
                params.name = this.searchValue;
            } else if (this.searchMode === "content") {
                params.content = this.searchValue;
            } else if (this.searchMode === "language") {
                params.language = this.searchValue;
            }
        }

        // Note: The API might not support multiple values for these filters
        // If it does support arrays, uncomment the array approach
        // If not, we'll need to make multiple requests or use the first selected value

        // For now, using the first selected value if any are selected
        if (this.selectedStatuses.size > 0) {
            params.status = Array.from(this.selectedStatuses)[0];
        }

        if (this.selectedCategories.size > 0) {
            params.category = Array.from(this.selectedCategories)[0];
        }

        if (this.selectedQualityScores.size > 0) {
            params.quality_score = Array.from(this.selectedQualityScores)[0];
        }

        return params as Partial<TemplateQueryParams>;
    }

    toggleStatus(status: TemplateStatus) {
        if (this.selectedStatuses.has(status)) {
            this.selectedStatuses.delete(status);
        } else {
            this.selectedStatuses.clear(); // Only one at a time
            this.selectedStatuses.add(status);
        }
        this.getInitialSearchTemplatesConcurrent();
    }

    toggleCategory(category: TemplateCategory) {
        if (this.selectedCategories.has(category)) {
            this.selectedCategories.delete(category);
        } else {
            this.selectedCategories.clear(); // Only one at a time
            this.selectedCategories.add(category);
        }
        this.getInitialSearchTemplatesConcurrent();
    }

    toggleQualityScore(score: TemplateQualityScore) {
        if (this.selectedQualityScores.has(score)) {
            this.selectedQualityScores.delete(score);
        } else {
            this.selectedQualityScores.clear(); // Only one at a time
            this.selectedQualityScores.add(score);
        }
        this.getInitialSearchTemplatesConcurrent();
    }

    clearAllFilters() {
        this.selectedStatuses.clear();
        this.selectedCategories.clear();
        this.selectedQualityScores.clear();
        this.searchValue = "";
        this.searchTemplates = [];
    }

    hasActiveFilters(): boolean {
        return (
            this.selectedStatuses.size > 0 ||
            this.selectedCategories.size > 0 ||
            this.selectedQualityScores.size > 0 ||
            this.searchValue.length > 0
        );
    }

    async addTemplatesToTemplatesByName(templates: Template[]) {
        templates.forEach(async template => {
            await this.templateMutexSwapper.acquire(template.name);
            this.templatesByName.set(template.name, template);
            await this.templateMutexSwapper.release(template.name);
        });
    }

    /**
     * Meta doesn't support exact lookups by template name or ID,
     * so we need to paginate through the results and filter manually.
     */
    private async findExactTemplateByName(templateName: string, PAGE_SIZE = 20): Promise<Template> {
        let cursor: string | undefined;

        while (true) {
            const response = await this.templateController.get({
                name: templateName,
                limit: PAGE_SIZE,
                after: cursor,
            });

            // Try to find an exact match in the current page
            const match = response.data.find(template => template.name === templateName);
            if (match) {
                return match;
            }

            // No match in this page; check if there's another page to query
            cursor = response.paging?.cursors.after;

            if (!cursor) {
                // We've exhausted all pages without finding the template
                throw new Error(`Template "${templateName}" not found in Meta API.`);
            }
        }
    }
}
