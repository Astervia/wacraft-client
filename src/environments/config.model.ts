export interface EnvironmentConfig {
    env: string;

    mainServerUrl: string;
    mainServerSecurity: boolean;
    appTitle: string;

    googleMapsApiKey?: string;

    webSocketBasePingInterval: number;
}
