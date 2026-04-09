import { environment } from "../../../environments/environment";

export function isTrustedUrl(url: string): boolean {
    if (url.startsWith("blob:")) {
        return true;
    }

    try {
        const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
        const hostname = parsedUrl.hostname.toLowerCase();

        const trustedHosts = [environment.mainServerUrl, environment.automationServerUrl].filter(
            Boolean,
        ) as string[];

        return trustedHosts.some(trustedHost => {
            try {
                const trustedParsed = new URL(
                    trustedHost.startsWith("http") ? trustedHost : `https://${trustedHost}`,
                );
                return hostname === trustedParsed.hostname.toLowerCase();
            } catch {
                return hostname === trustedHost.toLowerCase();
            }
        });
    } catch {
        return false;
    }
}
