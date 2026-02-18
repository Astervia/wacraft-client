import { Audit } from "../../common/model/audit.model";

export interface PlanFields extends Audit {
    name: string;
    slug: string;
    description?: string;
    throughput_limit: number;
    window_seconds: number;
    duration_days: number;
    price_cents: number;
    currency: string;
    is_default: boolean;
    is_custom: boolean;
    active: boolean;
    stripe_price_id?: string;
    stripe_product_id?: string;
}

export type Plan = PlanFields;
