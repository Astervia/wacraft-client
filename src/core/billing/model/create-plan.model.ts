export interface CreatePlan {
    name: string;
    slug: string;
    description?: string;
    throughput_limit: number;
    window_seconds: number;
    duration_days: number;
    price_cents: number;
    currency: string;
    is_default?: boolean;
    is_custom?: boolean;
    active?: boolean;
}

export type UpdatePlan = Partial<CreatePlan>;
