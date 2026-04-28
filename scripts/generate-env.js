const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "../src/environments/environment.ts");
const envPath = path.join(__dirname, "../.env");

// Check if environment.ts already exists
if (fs.existsSync(targetPath)) {
    console.log("environment.ts already exists.");
}

function stripInlineComment(value) {
    let quote = null;

    for (let i = 0; i < value.length; i++) {
        const char = value[i];
        const previousChar = value[i - 1];

        if ((char === `"` || char === "'") && previousChar !== "\\") {
            quote = quote === char ? null : quote || char;
            continue;
        }

        if (char === "#" && !quote && /\s/.test(previousChar || "")) {
            return value.slice(0, i).trimEnd();
        }
    }

    return value.trim();
}

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    return fs
        .readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .reduce((env, line) => {
            const trimmedLine = line.trim();

            if (!trimmedLine || trimmedLine.startsWith("#")) {
                return env;
            }

            const normalizedLine = trimmedLine.startsWith("export ")
                ? trimmedLine.slice(7).trimStart()
                : trimmedLine;
            const separatorIndex = normalizedLine.indexOf("=");

            if (separatorIndex === -1) {
                return env;
            }

            const key = normalizedLine.slice(0, separatorIndex).trim();
            let value = stripInlineComment(normalizedLine.slice(separatorIndex + 1));

            if (
                (value.startsWith(`"`) && value.endsWith(`"`)) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }

            env[key] = value;
            return env;
        }, {});
}

const dotEnv = parseEnvFile(envPath);
const env = { ...process.env, ...dotEnv };
const getEnv = (key, fallback) => env[key] ?? fallback;
const getBoolEnv = key => getEnv(key, "false") === "true";
const getNumberEnv = (key, fallback) => Number(getEnv(key, fallback));
const tsString = value => JSON.stringify(String(value));

const envLines = [
    `    env: ${tsString(getEnv("ENV", "production"))},`,
    ``,
    `    mainServerUrl: ${tsString(getEnv("MAIN_SERVER_URL", undefined))},`,
    `    mainServerSecurity: ${getBoolEnv("MAIN_SERVER_SECURITY")},`,
];

envLines.push(
    `    appTitle: ${tsString(getEnv("APP_TITLE", "wacraft"))},`,
    ``,
    `    webSocketBasePingInterval: ${getNumberEnv("WEBSOCKET_BASE_PING_INTERVAL", 30000)},`,
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
