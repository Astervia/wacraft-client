import { Audit } from "../../common/model/audit.model";

export interface PhoneConfigFields extends Audit {
    name: string;
    workspace_id: string;
    waba_id: string;
    waba_account_id: string;
    display_phone: string;
    is_active: boolean;
    meta_app_secret: string;
    access_token: string;
    webhook_verify_token: string;
}

export type PhoneConfig = PhoneConfigFields;
