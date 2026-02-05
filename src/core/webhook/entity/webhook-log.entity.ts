import { Audit } from "../../common/model/audit.model";
import { Webhook } from "./webhook.entity";

export interface WebhookLogFields extends Audit {
    payload: unknown;
    http_response_code: number;
    response_data: unknown;
    webhook_id: string;
    delivery_id?: string;
    attempt_number: number;
    duration_ms: number;
    signature_sent: boolean;
    request_url: string;
    request_headers?: Record<string, string>;
    idempotency_key?: string;
}

export interface WebhookLog extends WebhookLogFields {
    webhook: Webhook;
}
