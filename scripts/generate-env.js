const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "../src/environments/environment.ts");

// Check if environment.ts already exists
if (fs.existsSync(targetPath)) {
    console.log("environment.ts already exists.");
}

const hasEnv = key => Object.prototype.hasOwnProperty.call(process.env, key);

const envLines = [
    `    env: "${process.env.ENV || "production"}",`,
    `    isLite: ${process.env.IS_LITE != "false"},`,
    ``,
    `    mainServerUrl: "${process.env.MAIN_SERVER_URL}",`,
    `    mainServerSecurity: ${process.env.MAIN_SERVER_SECURITY == "true"},`,
];

if (hasEnv("AUTOMATION_SERVER_URL")) {
    envLines.push(`    automationServerUrl: "${process.env.AUTOMATION_SERVER_URL}",`);
}
if (hasEnv("AUTOMATION_SERVER_SECURITY")) {
    envLines.push(
        `    automationServerSecurity: ${process.env.AUTOMATION_SERVER_SECURITY == "true"},`,
    );
}
if (hasEnv("GOOGLE_MAPS_API_KEY")) {
    envLines.push(`    googleMapsApiKey: "${process.env.GOOGLE_MAPS_API_KEY}",`);
}

envLines.push(
    `    appTitle: "${process.env.APP_TITLE || "wacraft"}",`,
    ``,
    `    webSocketBasePingInterval: ${process.env.WEBSOCKET_BASE_PING_INTERVAL || 30000},`,
);

// Template for the environment.ts file
const envConfigFile = `
import { EnvironmentConfig } from "./config.model";

export const environment: EnvironmentConfig = {
${envLines.join("\n")}
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
