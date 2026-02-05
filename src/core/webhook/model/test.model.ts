export interface TestWebhookRequest {
    webhook_id: string;
    payload?: unknown;
}

export interface TestWebhookResponse {
    success: boolean;
    status_code: number;
    duration_ms: number;
    response?: unknown;
    response_body?: unknown;
    headers_sent: Record<string, string>;
    error?: string;
}
