import { Injectable, inject } from "@angular/core";
import { NGXLogger } from "ngx-logger";
import { PhoneConfig } from "../entity/phone-config.entity";
import { PhoneConfigControllerService } from "../controller/phone-config-controller.service";
import { WorkspaceStoreService } from "../../workspace/store/workspace-store.service";
import { DateOrderEnum } from "../../common/model/date-order.model";

@Injectable({
    providedIn: "root",
})
export class PhoneConfigStoreService {
    private phoneConfigController = inject(PhoneConfigControllerService);
    private workspaceStore = inject(WorkspaceStoreService);
    private logger = inject(NGXLogger);

    private paginationLimit = 15;

    public reachedMaxLimit = false;
    loading = false;

    phoneConfigs: PhoneConfig[] = [];
    phoneConfigsById = new Map<string, PhoneConfig>();

    constructor() {
        this.workspaceStore.workspaceChanged.subscribe(() => {
            this.phoneConfigs = [];
            this.phoneConfigsById.clear();
            this.reachedMaxLimit = false;
        });
    }

    async get(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;

        const configs = await this.phoneConfigController.get(
            ws.id,
            {
                limit: this.paginationLimit,
                offset: this.phoneConfigs.length,
            },
            { created_at: DateOrderEnum.desc },
        );

        if (!configs.length) {
            this.reachedMaxLimit = true;
            return;
        }

        this.add(configs);
    }

    add(configs: PhoneConfig[]) {
        this.addToMap(configs);
        this.phoneConfigs = [...this.phoneConfigs, ...configs];
    }

    async load(): Promise<void> {
        this.loading = true;
        this.phoneConfigs = [];
        this.phoneConfigsById.clear();
        this.reachedMaxLimit = false;
        try {
            await this.get();
        } catch (error) {
            this.logger.error("Error loading phone configs", error);
        } finally {
            this.loading = false;
        }
    }

    private addToMap(configs: PhoneConfig[]) {
        configs.forEach(c => {
            this.phoneConfigsById.set(c.id, c);
        });
    }

    async getById(id: string): Promise<PhoneConfig | undefined> {
        return this.phoneConfigsById.get(id);
    }
}
