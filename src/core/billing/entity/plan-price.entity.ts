import { Audit } from "../../common/model/audit.model";

export interface PlanPriceFields extends Audit {
    plan_id: string;
    currency: string;
    price_cents: number;
    is_default: boolean;
    stripe_price_id?: string;
    stripe_product_id?: string;
}

export type PlanPrice = PlanPriceFields;
