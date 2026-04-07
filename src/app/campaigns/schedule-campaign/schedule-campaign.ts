import { Component, EventEmitter, Input, Output, ViewChild, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { NGXLogger } from "ngx-logger";
import { CampaignFields } from "../../../core/campaign/entity/campaign.entity";
import { CampaignControllerService } from "../../../core/campaign/controller/campaign-controller.service";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-schedule-campaign",
    imports: [CommonModule, FormsModule, MatIconModule, TimeoutErrorModalComponent],
    templateUrl: "./schedule-campaign.html",
    styleUrl: "./schedule-campaign.scss",
})
export class ScheduleCampaign {
    @Input() campaign!: CampaignFields;
    @Output() campaignChanged = new EventEmitter<CampaignFields>();
    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    scheduledAtInput = "";
    loading = false;
    errorMessage = "";
    errorData: unknown;

    private readonly logger = inject(NGXLogger);
    private readonly campaignController = inject(CampaignControllerService);

    get minDateTime(): string {
        return new Date().toISOString().slice(0, 16);
    }

    async onSchedule(): Promise<void> {
        if (!this.scheduledAtInput) return;
        const utc = new Date(this.scheduledAtInput).toISOString();
        this.loading = true;
        try {
            const updated = await this.campaignController.schedule(this.campaign.id, utc);
            this.campaignChanged.emit(updated);
        } catch (err) {
            this.handleErr("Failed to schedule campaign", err);
        } finally {
            this.loading = false;
        }
    }

    async onUnschedule(): Promise<void> {
        this.loading = true;
        try {
            const updated = await this.campaignController.unschedule(this.campaign.id);
            this.campaignChanged.emit(updated);
        } catch (err) {
            this.handleErr("Failed to unschedule campaign", err);
        } finally {
            this.loading = false;
        }
    }

    handleErr(msg: string, err: unknown): void {
        if (isHttpError(err)) {
            this.errorData = err.response?.data;
            this.errorMessage = err.response?.data?.description ?? msg;
        } else {
            this.errorData = err;
            this.errorMessage = msg;
        }
        this.logger.error(msg, err);
        this.errorModal.openModal();
    }
}
