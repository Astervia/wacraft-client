export enum Policy {
    // Workspace
    workspace_admin = "workspace.admin",
    workspace_settings = "workspace.settings",
    workspace_members = "workspace.members",

    // Phone Config
    phone_config_read = "phone_config.read",
    phone_config_manage = "phone_config.manage",

    // Contact
    contact_read = "contact.read",
    contact_manage = "contact.manage",

    // Message
    message_read = "message.read",
    message_send = "message.send",

    // Campaign
    campaign_read = "campaign.read",
    campaign_manage = "campaign.manage",
    campaign_run = "campaign.run",

    // Webhook
    webhook_read = "webhook.read",
    webhook_manage = "webhook.manage",
}

export const AdminPolicies: Policy[] = Object.values(Policy);

export const MemberPolicies: Policy[] = [
    Policy.message_read,
    Policy.message_send,
    Policy.contact_read,
    Policy.contact_manage,
    Policy.campaign_read,
    Policy.campaign_manage,
    Policy.campaign_run,
    Policy.webhook_read,
    Policy.webhook_manage,
    Policy.phone_config_read,
];

export const ViewerPolicies: Policy[] = [
    Policy.message_read,
    Policy.contact_read,
    Policy.campaign_read,
    Policy.phone_config_read,
];

export function hasPolicy(policies: Policy[], required: Policy): boolean {
    return policies.includes(required);
}
