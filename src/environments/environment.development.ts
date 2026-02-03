import { EnvironmentConfig } from "./config.model";

export const environment: EnvironmentConfig = {
    isLite: true,

    env: "development",

    mainServerUrl: "localhost:6900",
    mainServerSecurity: true,
    automationServerUrl: "localhost:1880",
    automationServerSecurity: true,
    googleMapsApiKey: undefined, // Set your Google Maps API key here (should allow Google Places API and Google Maps JavaScript API)
    appTitle: "wacraft",

    webSocketBasePingInterval: 30000,
};
