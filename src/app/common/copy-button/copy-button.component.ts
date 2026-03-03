import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
    selector: "app-copy-button",
    standalone: true,
    imports: [CommonModule],
    templateUrl: "./copy-button.component.html",
})
export class CopyButtonComponent {
    @Input({ required: true }) textToCopy = "";
    @Input() buttonClass = "";
    @Input() copiedTextClass = "text-green-500 dark:text-green-400";
    @Input() defaultIconClass = "h-3.5 w-3.5";
    @Input() copiedIconClass = "h-3.5 w-3.5";

    copied = false;

    async copy(event: Event): Promise<void> {
        event.stopPropagation();
        try {
            await navigator.clipboard.writeText(this.textToCopy);
            this.copied = true;
            setTimeout(() => {
                this.copied = false;
            }, 1500);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }
}
