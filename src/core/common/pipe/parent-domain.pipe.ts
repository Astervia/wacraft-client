import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: "parentDomain",
    standalone: true,
})
export class ParentDomainPipe implements PipeTransform {
    transform(subdomainUrl: string): unknown {
        try {
            // Prepend protocol if missing to create a valid URL
            if (!/^https?:\/\//i.test(subdomainUrl)) {
                subdomainUrl = `https://${subdomainUrl}`;
            }
            const url = new URL(subdomainUrl);
            const hostnameParts = url.hostname.split(".");

            // Assuming the parent domain is the last three parts (e.g., whatsappmanager.criaup.com.br)
            if (hostnameParts.length >= 3) {
                const parentDomain = hostnameParts.slice(-3).join(".");
                return `.${parentDomain}`; // Leading dot for subdomain access
            } else {
                // Fallback to the full hostname if it's shorter than expected
                return url.hostname;
            }
        } catch (error) {
            this.logger.error("Error parsing URL for parent domain:", error);
            // Fallback to using the full automationServerUrl
            return subdomainUrl;
        }
    }
}
