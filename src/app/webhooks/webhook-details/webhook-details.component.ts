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
import { CopyButtonComponent } from "../../common/copy-button/copy-button.component";
import { UserStoreService } from "../../../core/user/store/user-store.service";

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
        CopyButtonComponent,
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
    userStore = inject(UserStoreService);

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

    // Headers import/export modal state
    showHeadersImportModal = false;
    headersImportText = "";
    headersImportError = "";

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
                    await this.webhookStore.prependWebhook(wh);
                    this.signingSecret = wh.signing_secret;
                    await this.router.navigate([], {
                        queryParams: {
                            "webhook.id": wh.id,
                            ...this.queryParamsService.globalQueryParams,
                        },
                        preserveFragment: true,
                        queryParamsHandling: "replace",
                    });
                    this.webhookId = wh.id;
                    this.webhook = await this.webhookStore.getById(wh.id);
                    this.isEditing = false;
                    return;
                }
                const updatedWebhook = await this.webhookController.update({
                    id: this.webhookId,
                    url: this.webhook.url,
                    authorization: this.webhook.authorization,
                    event: this.webhook.event,
                    http_method: this.webhook.http_method,
                    timeout: this.webhook.timeout,
                    is_active: this.webhook.is_active,
                    max_retries: this.webhook.max_retries,
                    retry_delay_ms: this.webhook.retry_delay_ms,
                    custom_headers: customHeadersRecord,
                    event_filter: this.webhook.event_filter,
                });
                await this.webhookStore.syncWebhook(updatedWebhook);
                this.webhook = await this.webhookStore.getById(updatedWebhook.id);
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

            // Normalize event_filter so downstream code can rely on conditions being an array
            if (this.webhook.event_filter && !Array.isArray(this.webhook.event_filter.conditions)) {
                this.webhook.event_filter.conditions = [];
            }

            // Set toggle states based on existing data
            this.showSecuritySection = this.webhook.signing_enabled;
            this.showCustomHeaders = this.customHeaders.length > 0;
            this.showEventFilter = (this.webhook.event_filter?.conditions?.length ?? 0) > 0;
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
                await this.webhookStore.removeWebhook(this.webhookId);
                await this.resetWebhookId(); // Call to reset or clean up after deletion
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

    // Headers JSON import / export
    openHeadersImportModal() {
        const seed: Record<string, string> = {};
        if (this.webhook.authorization) seed["Authorization"] = this.webhook.authorization;
        this.customHeaders.forEach(h => {
            if (h.key) seed[h.key] = h.value;
        });
        this.headersImportText = Object.keys(seed).length
            ? JSON.stringify(seed, null, 2)
            : '{\n  "X-Custom-Header": "value"\n}';
        this.headersImportError = "";
        this.showHeadersImportModal = true;
    }

    closeHeadersImportModal() {
        this.showHeadersImportModal = false;
        this.headersImportError = "";
    }

    applyHeadersImport() {
        let parsed: unknown;
        try {
            parsed = JSON.parse(this.headersImportText);
        } catch {
            this.headersImportError = "Invalid JSON.";
            return;
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            this.headersImportError = "Expected a JSON object with string values.";
            return;
        }
        const entries = Object.entries(parsed as Record<string, unknown>);
        for (const [k, v] of entries) {
            if (typeof v !== "string") {
                this.headersImportError = `Header "${k}" must be a string.`;
                return;
            }
        }
        const next: { key: string; value: string }[] = [];
        let authValue: string | undefined;
        for (const [k, v] of entries as [string, string][]) {
            if (k.toLowerCase() === "authorization") {
                authValue = v;
                continue;
            }
            next.push({ key: k, value: v });
        }
        this.customHeaders = next;
        if (authValue !== undefined) this.webhook.authorization = authValue;
        this.showCustomHeaders = next.length > 0;
        this.closeHeadersImportModal();
    }

    exportHeadersAsJson() {
        const out: Record<string, string> = {};
        if (this.webhook.authorization) out["Authorization"] = this.webhook.authorization;
        this.customHeaders.forEach(h => {
            if (h.key) out[h.key] = h.value;
        });
        const text = JSON.stringify(out, null, 2);
        const blob = new Blob([text], { type: "application/json;charset=utf-8" });
        const filename = `webhook-headers-${this.webhookId ?? "new"}.json`;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    // Event Filter Management
    addFilterCondition() {
        if (!this.webhook.event_filter) {
            this.webhook.event_filter = {
                logic: "AND",
                conditions: [],
            };
        } else if (!Array.isArray(this.webhook.event_filter.conditions)) {
            this.webhook.event_filter.conditions = [];
        }
        this.webhook.event_filter.conditions.push({
            path: "",
            operator: "equals",
            value: "",
        });
    }

    removeFilterCondition(index: number) {
        if (this.webhook.event_filter?.conditions) {
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

    // Validation
    private isValidUrl(value: string | undefined): boolean {
        if (!value) return false;
        try {
            const u = new URL(value);
            return u.protocol === "http:" || u.protocol === "https:";
        } catch {
            return false;
        }
    }

    get urlValid(): boolean {
        return this.isValidUrl(this.webhook?.url);
    }

    get timeoutValid(): boolean {
        const v = this.webhook?.timeout;
        return typeof v === "number" && v >= 1 && v <= 60;
    }

    get maxRetriesValid(): boolean {
        const v = this.webhook?.max_retries;
        return typeof v === "number" && v >= 0 && v <= 10;
    }

    get retryDelayValid(): boolean {
        const v = this.webhook?.retry_delay_ms;
        return typeof v === "number" && v >= 100 && v <= 60000;
    }

    get customHeadersValid(): boolean {
        if (!this.showCustomHeaders) return true;
        const seen = new Set<string>();
        for (const h of this.customHeaders) {
            if (!h.key || !h.key.trim()) return false;
            const k = h.key.trim().toLowerCase();
            if (k === "authorization") return false;
            if (seen.has(k)) return false;
            seen.add(k);
        }
        return true;
    }

    get eventFilterValid(): boolean {
        if (!this.showEventFilter) return true;
        const conditions = this.webhook?.event_filter?.conditions;
        if (!conditions?.length) return true;
        return conditions.every(c => {
            if (!c.path || !c.path.trim()) return false;
            if (c.operator !== "exists" && (c.value === undefined || c.value === "")) return false;
            return true;
        });
    }

    get isFormValid(): boolean {
        if (!this.webhook) return false;
        return (
            this.urlValid &&
            !!this.webhook.event &&
            !!this.webhook.http_method &&
            this.timeoutValid &&
            this.maxRetriesValid &&
            this.retryDelayValid &&
            this.customHeadersValid &&
            this.eventFilterValid
        );
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
