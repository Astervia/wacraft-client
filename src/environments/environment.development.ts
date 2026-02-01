import { EnvironmentConfig } from "./config.model";

export const environment: EnvironmentConfig = {
    isLite: true,

    env: "development",

    googleMapsApiKey: "your google maps api key", // Should allow  Google Places API and Google Maps JavaScript API
    mainServerUrl: "localhost:6900",
    mainServerSecurity: true,
    automationServerUrl: "localhost:1880",
    automationServerSecurity: true,
    appTitle: "wacraft",

    webSocketBasePingInterval: 30000,
};
