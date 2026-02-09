import { EnvironmentConfig } from "./config.model";

export const environment: EnvironmentConfig = {
    isLite: true,

    env: "development",

    mainServerUrl: "localhost:6900",
    mainServerSecurity: false,
    appTitle: "wacraft",

    webSocketBasePingInterval: 30000,
};
