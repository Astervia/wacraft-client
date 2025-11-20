import { Component, EventEmitter, Output, ViewChild, OnInit, inject } from "@angular/core";
import { CampaignMessageControllerService } from "../../../core/campaign/controller/campaign-message-controller.service";
import { ActivatedRoute } from "@angular/router";

import { FormsModule } from "@angular/forms";
import { MatTooltipModule } from "@angular/material/tooltip";
import * as Papa from "papaparse";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { FileUploadComponent } from "../../common/file-upload/file-upload.component";
import { NGXLogger } from "ngx-logger";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";
import { SenderData } from "../../../core/message/model/sender-data.model";

@Component({
    selector: "app-campaign-message-builder",
    imports: [
    FormsModule,
    MatTooltipModule,
    TimeoutErrorModalComponent,
    FileUploadComponent
],
    templateUrl: "./campaign-message-builder.component.html",
    styleUrl: "./campaign-message-builder.component.scss",
    standalone: true,
})
export class CampaignMessageBuilderComponent implements OnInit {
    private static readonly textFileError = "Error reading file";
    private campaignMessagesController = inject(CampaignMessageControllerService);
    private route = inject(ActivatedRoute);
    private logger = inject(NGXLogger);

    campaignId?: string;
    selectedFile?: File;
    error?: string;
    successes = 0;
    errors = 0;
    uploadFileType: "json" | "csv" = "csv";

    @Output() messagesAdded = new EventEmitter();
    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    async ngOnInit(): Promise<void> {
        this.watchQueryParams();
    }

    watchQueryParams() {
        this.route.queryParams.subscribe(async params => {
            const campaignId = params["campaign.id"];
            if (campaignId !== this.campaignId) {
                this.campaignId = campaignId;
            }
        });
    }

    async onFileSelected(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.files || target.files.length <= 0) return (this.selectedFile = undefined);

        this.selectedFile = target.files[0];
        this.successes = 0;
        this.errors = 0;
    }

    cancel() {
        this.selectedFile = undefined;
        this.successes = 0;
        this.errors = 0;
    }

    // Existing readFile function
    async readFile(file: File): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event: ProgressEvent<FileReader>) => {
                try {
                    const content = event.target?.result;
                    if (typeof content !== "string") {
                        reject(CampaignMessageBuilderComponent.textFileError);
                        return;
                    }
                    resolve(JSON.parse(content));
                } catch (err) {
                    this.handleErr("Failed to read file", err);
                    reject(err);
                }
            };
            reader.onerror = () => {
                reject(CampaignMessageBuilderComponent.textFileError);
            };
            reader.readAsText(file);
        });
    }

    // Helper function to unflatten objects with dot notation keys, parsing arrays from JSON strings
    unflattenObject(data: Record<string, unknown>): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const keys = key.split(".");
                keys.reduce<Record<string, unknown>>((acc, part, index) => {
                    if (index === keys.length - 1) {
                        const value = data[key];
                        // Attempt to parse JSON strings to reconstruct arrays
                        try {
                            const parsed = typeof value === "string" ? JSON.parse(value) : value;
                            acc[part] = Array.isArray(parsed) ? parsed : parsed;
                        } catch {
                            acc[part] = value;
                        }
                    } else {
                        if (!acc[part]) {
                            acc[part] = {} as Record<string, unknown>;
                        }
                        return acc[part] as Record<string, unknown>;
                    }

                    return acc;
                }, result);
            }
        }
        return result;
    }

    async add() {
        this.error = ""; // Reset error
        this.successes = 0;
        this.errors = 0;

        if (!this.selectedFile) {
            this.error = "Please select a file.";
            return;
        }
        if (!this.campaignId) {
            this.error = "Campaign ID is required.";
            return;
        }

        switch (this.uploadFileType) {
            case "json":
                try {
                    const jsonData = (await this.readFile(this.selectedFile)) as unknown;
                    if (!jsonData) {
                        this.error = "Invalid file format.";
                        return;
                    } else if (!Array.isArray(jsonData)) {
                        this.error = "Invalid file format. JSON must be an array.";
                        return;
                    }
                    await Promise.all(
                        jsonData.map(async (data: Record<string, unknown>) => {
                            if (!data["to"]) {
                                this.errors++;
                                return;
                            }
                            try {
                                await this.campaignMessagesController.create({
                                    campaign_id: this.campaignId as string,
                                    sender_data: {
                                        messaging_product: "whatsapp",
                                        recipient_type: "individual",
                                        ...data,
                                        to: `${data["to"]}`,
                                    } as SenderData,
                                });
                                this.successes++;
                            } catch {
                                this.errors++;
                            }
                        }),
                    );
                } catch (err) {
                    this.handleErr("Error parsing JSON file.", err);
                    return;
                }
                break;

            case "csv":
                try {
                    const csvContent = await this.readFileAsText(this.selectedFile);
                    const parsed = Papa.parse(csvContent, {
                        header: true,
                        skipEmptyLines: true,
                    });

                    if (parsed.errors.length > 0) {
                        this.logger.error("Parsing errors:", parsed.errors);
                        this.error = "Error parsing CSV file.";
                        return;
                    }

                    const jsonData = parsed.data as Record<string, unknown>[];

                    if (!Array.isArray(jsonData)) {
                        this.error = "Invalid CSV format.";
                        return;
                    }

                    // Unflatten each object if necessary
                    const processedData = jsonData.map(item => {
                        const unflatten = this.unflattenObject(item);
                        unflatten["to"] = `${unflatten["to"] ?? ""}`;
                        return unflatten;
                    });

                    await Promise.all(
                        processedData.map(async (data: Record<string, unknown>) => {
                            if (!data["to"]) {
                                this.errors++;
                                return;
                            }
                            try {
                                await this.campaignMessagesController.create({
                                    campaign_id: this.campaignId as string,
                                    sender_data: {
                                        messaging_product: "whatsapp",
                                        recipient_type: "individual",
                                        ...data,
                                        to: `${data["to"]}`,
                                    } as SenderData,
                                });
                                this.successes++;
                            } catch {
                                this.errors++;
                            }
                        }),
                    );
                } catch (err) {
                    this.handleErr("Error processing CSV file.", err);
                    return;
                }
                break;

            default:
                this.error = "Unsupported file type.";
                return;
        }

        this.messagesAdded.emit();
    }

    // Helper function to read file as text (for CSV)
    readFileAsText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event: ProgressEvent<FileReader>) => {
                const result = event.target?.result;
                if (typeof result === "string") {
                    resolve(result);
                } else {
                    reject(CampaignMessageBuilderComponent.textFileError);
                }
            };
            reader.onerror = () => {
                reject(CampaignMessageBuilderComponent.textFileError);
            };
            reader.readAsText(file);
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
}
