export interface CreatePhoneConfig {
    name: string;
    waba_id: string;
    waba_account_id: string;
    display_phone: string;
    meta_app_secret: string;
    access_token: string;
    webhook_verify_token: string;
    is_active?: boolean;
}

export type UpdatePhoneConfig = Partial<CreatePhoneConfig>;
