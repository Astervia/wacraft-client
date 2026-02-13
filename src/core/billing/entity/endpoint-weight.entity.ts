import { Audit } from "../../common/model/audit.model";

export interface EndpointWeightFields extends Audit {
    method: string;
    path_pattern: string;
    weight: number;
    description?: string;
}

export type EndpointWeight = EndpointWeightFields;
