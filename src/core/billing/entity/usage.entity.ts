export interface UsageInfo {
    scope: "user" | "workspace";
    user_id?: string;
    workspace_id?: string;
    unlimited: boolean;
    fallback: boolean;
    throughput_limit: number;
    window_seconds: number;
    current_usage: number;
    remaining: number;
}
