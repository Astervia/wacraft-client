// Payment is read live from the payment provider (Stripe) — it is not a
// persisted entity, so it does not extend Audit.
export interface Payment {
    id: string;
    amount_cents: number;
    currency: string;
    status: string; // requires_action, processing, succeeded, canceled, ...
    payment_method: string; // e.g. "card", "boleto"
    description?: string;
    created_at: string;
    boleto_url?: string; // Hosted boleto voucher page (present while awaiting payment)
    boleto_pdf_url?: string; // Downloadable boleto voucher PDF
    receipt_url?: string; // Receipt for a succeeded charge
}
