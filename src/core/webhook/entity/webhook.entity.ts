import { Audit } from "../../common/model/audit.model";
import { HttpMethod } from "../../common/model/http-methods.model";
import { Event } from "../model/event.model";
import { CircuitState } from "../model/circuit-state.model";
import { EventFilter } from "../model/event-filter.model";

export interface Webhook extends Audit {
    url: string;
    authorization?: string;
    http_method: HttpMethod;
    timeout: number;
    event: Event;
    signing_enabled: boolean;
    max_retries: number;
    retry_delay_ms: number;
    is_active: boolean;
    custom_headers?: Record<string, string>;
    event_filter?: EventFilter;
    circuit_state: CircuitState;
    failure_count: number;
    last_failure_at?: Date;
    circuit_opened_at?: Date;
}
