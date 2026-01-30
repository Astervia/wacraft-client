import { Audit } from "../../common/model/audit.model";
import { User } from "../../user/entity/user.entity";
import { Workspace } from "./workspace.entity";
import { Policy } from "../model/policy.model";

export interface WorkspaceMemberFields extends Audit {
    workspace_id: string;
    user_id: string;
}

export interface WorkspaceMember extends WorkspaceMemberFields {
    workspace?: Workspace;
    user?: User;
    policies?: Policy[];
}
