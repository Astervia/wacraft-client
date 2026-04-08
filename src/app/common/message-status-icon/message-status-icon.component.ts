import { Component, Input, inject } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { SendingStatus } from "../../../core/status/model/sending-status.model";
import { STATUS_ICON_REPOSITORY } from "../repository/status-icon.repository";

@Component({
    selector: "app-message-status-icon",
    standalone: true,
    templateUrl: "./message-status-icon.component.html",
})
export class MessageStatusIconComponent {
    private sanitizer = inject(DomSanitizer);

    @Input({ required: true }) status!: SendingStatus;
    @Input() size?: string;

    protected sentSvg = this.sanitize("sent");
    protected doubleCheckSvg = this.sanitize("delivered");

    private sanitize(key: string): SafeHtml | null {
        const svg = STATUS_ICON_REPOSITORY[key]?.svgContent;
        return svg ? this.sanitizer.bypassSecurityTrustHtml(svg) : null;
    }
}
