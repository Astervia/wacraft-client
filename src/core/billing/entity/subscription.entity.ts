import { Audit } from "../../common/model/audit.model";
import { PlanFields } from "./plan.entity";

export type PaymentMode = "payment" | "subscription";
export type SubscriptionStatus = "pending" | "active" | "cancelled";

export interface SubscriptionFields extends Audit {
    status: SubscriptionStatus;
    plan_id: string;
    scope: "user" | "workspace";
    user_id: string;
    workspace_id?: string;
    throughput_override?: number;
    starts_at: string;
    expires_at: string;
    cancelled_at?: string;
    payment_provider: string;
    payment_external_id?: string;
    payment_mode: PaymentMode;
    stripe_subscription_id?: string;
    cancel_at_period_end: boolean;
    plan?: PlanFields;
}

export type Subscription = SubscriptionFields;
