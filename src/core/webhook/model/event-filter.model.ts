export type FilterLogic = "AND" | "OR";
export type FilterOperator = "equals" | "contains" | "regex" | "exists";

export interface FilterCondition {
    path: string;
    operator: FilterOperator;
    value?: unknown;
}

export interface EventFilter {
    logic?: FilterLogic;
    conditions: FilterCondition[];
}
