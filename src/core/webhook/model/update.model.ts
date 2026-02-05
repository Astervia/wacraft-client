import { HttpMethod } from "../../common/model/http-methods.model";
import { Event } from "./event.model";
import { EventFilter } from "./event-filter.model";

export interface Update {
    id: string;
    url?: string;
    authorization?: string;
    event?: Event;
    http_method?: HttpMethod;
    timeout?: number;
    is_active?: boolean;
    max_retries?: number;
    retry_delay_ms?: number;
    custom_headers?: Record<string, string>;
    event_filter?: EventFilter;
}
