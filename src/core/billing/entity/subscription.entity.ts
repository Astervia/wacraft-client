import { Audit } from "../../common/model/audit.model";
import { PlanFields } from "./plan.entity";

export interface SubscriptionFields extends Audit {
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
    plan?: PlanFields;
}

export type Subscription = SubscriptionFields;
