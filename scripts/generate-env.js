const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "../src/environments/environment.ts");

// Check if environment.ts already exists
if (fs.existsSync(targetPath)) {
    console.log("environment.ts already exists.");
}

// Template for the environment.ts file
const envConfigFile = `
import { EnvironmentConfig } from "./config.model";

export const environment: EnvironmentConfig = {
    env: "${process.env.ENV || "production"}",
    isLite: ${process.env.IS_LITE != "false"},

    mainServerUrl: "${process.env.MAIN_SERVER_URL}",
    mainServerSecurity: ${process.env.MAIN_SERVER_SECURITY == "true"},
    automationServerUrl: ${process.env.AUTOMATION_SERVER_URL ? `"${process.env.AUTOMATION_SERVER_URL}"` : "undefined"},
    automationServerSecurity: ${process.env.AUTOMATION_SERVER_SECURITY == "true"},
    googleMapsApiKey: ${process.env.GOOGLE_MAPS_API_KEY ? `"${process.env.GOOGLE_MAPS_API_KEY}"` : "undefined"},
    appTitle: "${process.env.APP_TITLE || "wacraft"}",

    webSocketBasePingInterval: ${process.env.WEBSOCKET_BASE_PING_INTERVAL || 30000},
};
`;

// Write the environment.ts file
fs.writeFile(targetPath, envConfigFile, err => {
    if (err) {
        console.error("Error writing environment.ts:", err);
        process.exit(1);
    }
    console.log(`Environment variables successfully written to ${targetPath}`);
});
