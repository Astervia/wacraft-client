export interface EnvironmentConfig {
    env: string;
    isLite: boolean;

    mainServerUrl: string;
    mainServerSecurity: boolean;
    appTitle: string;

    automationServerUrl?: string;
    automationServerSecurity?: boolean;

    googleMapsApiKey?: string;

    webSocketBasePingInterval: number;
}
