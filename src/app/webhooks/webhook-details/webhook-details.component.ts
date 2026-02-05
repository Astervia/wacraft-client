import { Component, OnInit, ViewChild, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { WebhookLogsComponent } from "../webhook-logs/webhook-logs.component";
import { MatIconModule } from "@angular/material/icon";
import { HttpMethod } from "../../../core/common/model/http-methods.model";
import { Webhook } from "../../../core/webhook/entity/webhook.entity";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";
import { WebhookControllerService } from "../../../core/webhook/controller/webhook-controller.service";
import { WebhookStoreService } from "../../../core/webhook/store/webhook-store.service";
import { Event } from "../../../core/webhook/model/event.model";
import { NGXLogger } from "ngx-logger";
import { MatTooltipModule } from "@angular/material/tooltip";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";
import { TestWebhookResponse } from "../../../core/webhook/model/test.model";
import { JsonViewerComponent } from "../../common/json-viewer/json-viewer.component";

@Component({
    selector: "app-webhook-details",
    imports: [
        CommonModule,
        FormsModule,
        WebhookLogsComponent,
        MatIconModule,
        MatTooltipModule,
        TimeoutErrorModalComponent,
        JsonViewerComponent,
    ],
    templateUrl: "./webhook-details.component.html",
    styleUrl: "./webhook-details.component.scss",
    standalone: true,
})
export class WebhookDetailsComponent implements OnInit {
    private queryParamsService = inject(QueryParamsService);
    private webhookController = inject(WebhookControllerService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private webhookStore = inject(WebhookStoreService);
    private logger = inject(NGXLogger);

    HttpMethod = HttpMethod;
    Event = Event;

    webhook!: Webhook;
    webhookId?: string;

    isEditing = false;
    signingSecret?: string;
    customHeaders: { key: string; value: string }[] = [];
    testResult?: TestWebhookResponse;
    showTestModal = false;
    testPayload = "{}";
    isTesting = false;

    // Toggle states for optional sections
    showSecuritySection = false;
    showCustomHeaders = false;
    showEventFilter = false;

    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    ngOnInit(): void {
        this.watchQueryParams();
    }

    async saveChanges() {
        if (this.webhook)
            try {
                // Convert custom headers array to Record
                const customHeadersRecord: Record<string, string> = {};
                this.customHeaders.forEach(h => {
                    if (h.key && h.value) {
                        customHeadersRecord[h.key] = h.value;
                    }
                });

                if (!this.webhookId) {
                    const wh = await this.webhookController.create({
                        url: this.webhook.url,
                        authorization: this.webhook.authorization,
                        event: this.webhook.event,
                        http_method: this.webhook.http_method,
                        timeout: this.webhook.timeout,
                        signing_enabled: this.webhook.signing_enabled,
                        max_retries: this.webhook.max_retries,
                        retry_delay_ms: this.webhook.retry_delay_ms,
                        custom_headers:
                            Object.keys(customHeadersRecord).length > 0
                                ? customHeadersRecord
                                : undefined,
                        event_filter: this.webhook.event_filter,
                    });
                    this.signingSecret = wh.signing_secret;
                    await this.router.navigate([], {
                        queryParams: {
                            "webhook.id": wh.id,
                            ...this.queryParamsService.globalQueryParams,
                        },
                        preserveFragment: true,
                        queryParamsHandling: "replace",
                    });
                    window.location.reload();
                    return;
                }
                await this.webhookController.update({
                    id: this.webhookId,
                    url: this.webhook.url,
                    authorization: this.webhook.authorization,
                    event: this.webhook.event,
                    http_method: this.webhook.http_method,
                    timeout: this.webhook.timeout,
                    is_active: this.webhook.is_active,
                    max_retries: this.webhook.max_retries,
                    retry_delay_ms: this.webhook.retry_delay_ms,
                    custom_headers:
                        Object.keys(customHeadersRecord).length > 0
                            ? customHeadersRecord
                            : undefined,
                    event_filter: this.webhook.event_filter,
                });
                this.isEditing = false;
                return;
            } catch (error) {
                this.handleErr("Error saving changes", error);
            }
    }

    watchQueryParams() {
        this.route.queryParams.subscribe(async params => {
            const webhookId = params["webhook.id"];
            if (!(webhookId != this.webhookId)) return await this.loadWebhook();
            this.webhookId = webhookId;
            return await this.loadWebhook();
        });
    }

    async loadWebhook() {
        if (!this.webhookId) {
            this.webhook = {
                id: "",
                url: "",
                http_method: HttpMethod.POST,
                timeout: 5,
                event: Event.ReceiveWhatsAppMessage,
                signing_enabled: false,
                max_retries: 3,
                retry_delay_ms: 1000,
                is_active: true,
                circuit_state: "closed",
                failure_count: 0,
                created_at: new Date(),
                updated_at: new Date(),
            };
            this.customHeaders = [];
            this.signingSecret = undefined;
            this.showSecuritySection = false;
            this.showCustomHeaders = false;
            this.showEventFilter = false;
            this.isEditing = true;
            return;
        }
        this.isEditing = false;
        this.signingSecret = undefined;
        try {
            this.webhook = await this.webhookStore.getById(this.webhookId);
            // Convert custom headers to array
            this.customHeaders = this.webhook.custom_headers
                ? Object.entries(this.webhook.custom_headers).map(([key, value]) => ({
                      key,
                      value,
                  }))
                : [];

            // Set toggle states based on existing data
            this.showSecuritySection = this.webhook.signing_enabled;
            this.showCustomHeaders = this.customHeaders.length > 0;
            this.showEventFilter =
                !!this.webhook.event_filter && this.webhook.event_filter.conditions.length > 0;
        } catch (error) {
            this.handleErr("Error loading webhook", error);
        }
    }

    toggleEdit() {
        this.isEditing = !this.isEditing;
    }

    cancelEdit() {
        if (!this.webhookId) {
            this.webhook = {
                id: "",
                url: "",
                http_method: HttpMethod.POST,
                timeout: 5,
                event: Event.ReceiveWhatsAppMessage,
                signing_enabled: false,
                max_retries: 3,
                retry_delay_ms: 1000,
                is_active: true,
                circuit_state: "closed",
                failure_count: 0,
                created_at: new Date(),
                updated_at: new Date(),
            };
            this.customHeaders = [];
            this.showSecuritySection = false;
            this.showCustomHeaders = false;
            this.showEventFilter = false;
            this.isEditing = true;
            return;
        }
        this.isEditing = false;
        this.loadWebhook();
    }

    async delete() {
        if (!this.webhookId) return;

        // Show confirmation alert
        const confirmed = window.confirm(
            "Are you sure you want to delete this webhook? This action cannot be undone.",
        );

        // If the user confirms, proceed with the deletion
        if (confirmed) {
            try {
                await this.webhookController.delete(this.webhookId);
                await this.resetWebhookId(); // Call to reset or clean up after deletion
                window.location.reload();
            } catch (error) {
                this.handleErr("Error deleting webhook", error);
            }
        }
    }

    async resetWebhookId() {
        await this.router.navigate([], {
            queryParams: this.queryParamsService.globalQueryParams,
            preserveFragment: true,
            queryParamsHandling: "replace",
        });
    }

    // Copy the given value to the clipboard
    async copyToClipboard(value?: string) {
        if (!value) return;
        await navigator.clipboard.writeText(value);
    }

    // Toggle Section Management
    toggleSecuritySection() {
        this.showSecuritySection = !this.showSecuritySection;
    }

    toggleCustomHeaders() {
        this.showCustomHeaders = !this.showCustomHeaders;
    }

    toggleEventFilter() {
        this.showEventFilter = !this.showEventFilter;
    }

    // Custom Headers Management
    addCustomHeader() {
        this.customHeaders.push({ key: "", value: "" });
    }

    removeCustomHeader(index: number) {
        this.customHeaders.splice(index, 1);
    }

    // Event Filter Management
    addFilterCondition() {
        if (!this.webhook.event_filter) {
            this.webhook.event_filter = {
                logic: "AND",
                conditions: [],
            };
        }
        this.webhook.event_filter.conditions.push({
            path: "",
            operator: "equals",
            value: "",
        });
    }

    removeFilterCondition(index: number) {
        if (this.webhook.event_filter) {
            this.webhook.event_filter.conditions.splice(index, 1);
        }
    }

    // Test Webhook
    async testWebhook() {
        if (!this.webhookId) return;

        this.isTesting = true;
        try {
            let payload: unknown;
            try {
                payload = this.testPayload ? JSON.parse(this.testPayload) : undefined;
            } catch (e) {
                this.handleErr("Invalid JSON payload", e);
                this.isTesting = false;
                return;
            }

            this.testResult = await this.webhookController.test(this.webhookId, payload);
            this.showTestModal = true;
        } catch (error) {
            this.handleErr("Error testing webhook", error);
        } finally {
            this.isTesting = false;
        }
    }

    closeTestModal() {
        this.showTestModal = false;
        this.testResult = undefined;
    }

    getTestResponsePayload(): unknown {
        if (!this.testResult) return undefined;
        return this.testResult.response ?? this.testResult.response_body;
    }

    getCircuitStateLabel(): string {
        if (!this.webhook) return "";
        switch (this.webhook.circuit_state) {
            case "closed":
                return "Closed (Healthy)";
            case "open":
                return `Open (${this.webhook.failure_count} failures)`;
            case "half_open":
                return "Half-Open (Testing)";
            default:
                return this.webhook.circuit_state;
        }
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
