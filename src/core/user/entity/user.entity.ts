import { Audit } from "../../common/model/audit.model";
import { Role } from "../model/role.model";

export interface UserFields extends Audit {
    name: string;
    email: string;
    password: string;
    role: Role;
}

export interface User extends UserFields {}
