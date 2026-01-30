import { Audit } from "../../common/model/audit.model";
import { Policy } from "../model/policy.model";

export interface WorkspaceMemberPolicyFields extends Audit {
    workspace_member_id: string;
    policy: Policy;
}

export type WorkspaceMemberPolicy = WorkspaceMemberPolicyFields;
