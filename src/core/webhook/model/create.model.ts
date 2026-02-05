import { HttpMethod } from "../../common/model/http-methods.model";
import { Event } from "./event.model";
import { EventFilter } from "./event-filter.model";

export interface Create {
    url: string;
    authorization?: string;
    event: Event;
    http_method: HttpMethod;
    timeout?: number;
    signing_enabled?: boolean;
    max_retries?: number;
    retry_delay_ms?: number;
    custom_headers?: Record<string, string>;
    event_filter?: EventFilter;
}

export interface CreateResponse {
    id: string;
    signing_secret?: string;
}
