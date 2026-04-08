import { CommonModule } from "@angular/common";
import { Component, HostListener, Input, inject } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { Conversation } from "../../../core/message/model/conversation.model";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import {
    STATUS_ICON_REPOSITORY,
    IMessageStatusIcon,
} from "../../common/repository/status-icon.repository";

@Component({
    selector: "app-message-info",
    imports: [CommonModule, MatIconModule, MatTooltipModule],
    templateUrl: "./message-info.component.html",
    styleUrl: "./message-info.component.scss",
    standalone: true,
})
export class MessageInfoComponent {
    private sanitizer = inject(DomSanitizer);

    @Input() message!: Conversation;
    @Input() sent = true;

    showErrorModal = false;
    private sanitizedIconCache: Record<string, SafeHtml> = {};

    protected getStatusIcon(
        message: Conversation,
    ): (IMessageStatusIcon & { safeSvg?: SafeHtml }) | null {
        const status = message?.statuses?.[0]?.product_data?.status;
        if (!status) return null;

        const rawIcon = STATUS_ICON_REPOSITORY[status];
        if (!rawIcon) return null;

        if (rawIcon.type === "inline-svg" && rawIcon.svgContent) {
            if (!this.sanitizedIconCache[status]) {
                this.sanitizedIconCache[status] = this.sanitizer.bypassSecurityTrustHtml(
                    rawIcon.svgContent,
                );
            }
            return { ...rawIcon, safeSvg: this.sanitizedIconCache[status] };
        }

        return rawIcon;
    }

    get error() {
        return this.message?.statuses?.[0]?.product_data?.errors?.[0] ?? null;
    }

    toggleErrorModal() {
        this.showErrorModal = !this.showErrorModal;
    }

    closeErrorModal() {
        this.showErrorModal = false;
    }

    @HostListener("window:keydown.shift.escape", ["$event"])
    private closeOnShiftEscape(event: KeyboardEvent) {
        event.preventDefault();
        this.closeErrorModal();
    }
}
