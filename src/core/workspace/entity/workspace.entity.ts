import { Audit } from "../../common/model/audit.model";

export interface WorkspaceFields extends Audit {
    name: string;
    slug: string;
    description: string;
    created_by: string;
}

export type Workspace = WorkspaceFields;
