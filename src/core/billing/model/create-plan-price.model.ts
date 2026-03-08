export interface CreatePlanPrice {
    currency: string;
    price_cents: number;
    is_default?: boolean;
}

export interface UpdatePlanPrice {
    price_cents?: number;
    is_default?: boolean;
}
