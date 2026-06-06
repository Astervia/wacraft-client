import { Payment } from "../entity/payment.entity";

// Cursor-based pagination: payments are read live from the payment provider,
// so the cursor is the provider's opaque page token rather than an offset.
export interface PaymentQuery {
    limit?: number;
    cursor?: string;
}

export interface PaymentListResponse {
    data: Payment[];
    has_more: boolean;
    next_cursor?: string;
}
