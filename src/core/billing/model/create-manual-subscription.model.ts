export interface CreateManualSubscription {
    plan_id: string;
    scope: "user" | "workspace";
    user_id: string;
    workspace_id?: string;
    throughput_override?: number;
}
