import { Pipe, PipeTransform, inject } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { isTrustedUrl } from "../util/url-validator.util";

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

        if (isTrustedUrl(url)) {
            return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
        }

        console.warn(`SafeUrlPipe: Blocked untrusted URL: ${url}`);
        return "";
    }
}
