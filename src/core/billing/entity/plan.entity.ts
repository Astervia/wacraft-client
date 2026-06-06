import { Audit } from "../../common/model/audit.model";
import { PlanPrice } from "./plan-price.entity";

export interface PlanFields extends Audit {
    name: string;
    slug: string;
    description?: string;
    throughput_limit: number;
    window_seconds: number;
    duration_days: number;
    is_default: boolean;
    is_custom: boolean;
    active: boolean;
    // Optional: the backend omits this field entirely for plans that have no prices.
    prices?: PlanPrice[];
}

export type Plan = PlanFields;
