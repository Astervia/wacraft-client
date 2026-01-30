import { Audit } from "../../common/model/audit.model";
import { Role } from "../model/role.model";

export interface UserFields extends Audit {
    name: string;
    email: string;
    password: string;
    role: Role;
    email_verified?: boolean;
}

// export interface User extends UserFields {}
export type User = UserFields;
