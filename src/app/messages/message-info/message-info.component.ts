import { CommonModule } from "@angular/common";
import { Component, HostListener, Input } from "@angular/core";
import { Conversation } from "../../../core/message/model/conversation.model";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MessageStatusIconComponent } from "../../common/message-status-icon/message-status-icon.component";

@Component({
    selector: "app-message-info",
    imports: [CommonModule, MatIconModule, MatTooltipModule, MessageStatusIconComponent],
    templateUrl: "./message-info.component.html",
    styleUrl: "./message-info.component.scss",
    standalone: true,
})
export class MessageInfoComponent {
    @Input() message!: Conversation;
    @Input() sent = true;

    showErrorModal = false;

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
