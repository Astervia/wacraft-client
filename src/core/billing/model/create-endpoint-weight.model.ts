export interface CreateEndpointWeight {
    method: string;
    path_pattern: string;
    weight: number;
    description?: string;
}
