export interface CheckoutRequest {
    plan_id: string;
    scope: "user" | "workspace";
    workspace_id?: string;
    success_url: string;
    cancel_url: string;
}

export interface CheckoutResponse {
    checkout_url: string;
    external_id: string;
}
