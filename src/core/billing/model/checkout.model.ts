import { PaymentMode } from "../entity/subscription.entity";

export interface CheckoutRequest {
    plan_id: string;
    scope: "user" | "workspace";
    workspace_id?: string;
    payment_mode?: PaymentMode;
    success_url: string;
    cancel_url: string;
}

export interface CheckoutResponse {
    checkout_url: string;
    external_id: string;
}
