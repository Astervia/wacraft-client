import { Audit } from "../../common/model/audit.model";
import { MessagingProduct } from "../../messaging-product/entity/messaging-product.entity";

export type CampaignStatus =
    | "draft"
    | "scheduled"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";

export interface CampaignFields extends Audit {
    name: string;
    messaging_product_id: string;
    status: CampaignStatus;
    scheduled_at?: string | null;
}

export interface Campaign extends CampaignFields {
    messaging_product: MessagingProduct;
}
