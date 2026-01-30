import { Audit } from "../../common/model/audit.model";

export interface MessagingProductFields extends Audit {
    name: string;
    workspace_id?: string;
    phone_config_id?: string;
}

// export interface MessagingProduct extends MessagingProductFields {}
export type MessagingProduct = MessagingProductFields;
