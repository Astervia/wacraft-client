export interface EnvironmentConfig {
    env: string;
    isLite: boolean;

    mainServerUrl: string;
    mainServerSecurity: boolean;
    automationServerUrl?: string;
    automationServerSecurity: boolean;
    googleMapsApiKey: string;
    appTitle: string;

    webSocketBasePingInterval: number;
}
