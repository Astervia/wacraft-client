import { Pipe, PipeTransform, inject } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { environment } from "../../../environments/environment";

@Pipe({
    name: "safeUrl",
    standalone: true,
})
export class SafeUrlPipe implements PipeTransform {
    private domSanitizer = inject(DomSanitizer);

    transform(url: string): SafeResourceUrl | string {
        if (!url) {
            return "";
        }

        if (this.isTrusted(url)) {
            return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
        }

        console.warn(`SafeUrlPipe: Blocked untrusted URL: ${url}`);
        return "";
    }

    private isTrusted(url: string): boolean {
        if (url.startsWith("blob:")) {
            return true;
        }

        try {
            const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
            const hostname = parsedUrl.hostname.toLowerCase();

            const trustedHosts = [
                environment.mainServerUrl,
                environment.automationServerUrl,
            ].filter(Boolean) as string[];

            return trustedHosts.some((trustedHost) => {
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
}
