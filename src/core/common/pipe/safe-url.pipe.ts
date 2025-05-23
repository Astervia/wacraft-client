import { Pipe, PipeTransform } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

@Pipe({
    name: "safeUrl",
    standalone: true,
})
export class SafeUrlPipe implements PipeTransform {
    constructor(private domSanitizer: DomSanitizer) {}
    transform(url: string) {
        return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
    }
}
