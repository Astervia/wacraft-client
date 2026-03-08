import { CreatePlanPrice } from "./create-plan-price.model";

export interface CreatePlan {
    name: string;
    slug: string;
    description?: string;
    throughput_limit: number;
    window_seconds: number;
    duration_days: number;
    is_default?: boolean;
    is_custom?: boolean;
    active?: boolean;
    prices?: CreatePlanPrice[];
}

export type UpdatePlan = Partial<Omit<CreatePlan, "prices">>;
