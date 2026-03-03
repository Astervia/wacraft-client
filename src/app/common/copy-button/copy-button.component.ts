import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

export type CopyButtonSize = "sm" | "md" | "lg" | "none";

const SIZE_MAP: Record<"sm" | "md" | "lg", { button: string; icon: string }> = {
    sm: { button: "h-5 w-5", icon: "h-3 w-3" },
    md: { button: "h-7 w-7 p-1", icon: "h-4 w-4" },
    lg: { button: "h-9 w-9 p-2", icon: "h-5 w-5" },
};

@Component({
    selector: "app-copy-button",
    standalone: true,
    imports: [CommonModule],
    templateUrl: "./copy-button.component.html",
})
export class CopyButtonComponent {
    @Input({ required: true }) textToCopy = "";
    @Input() size: CopyButtonSize = "md";
    @Input() buttonClass = "";
    @Input() copiedTextClass = "text-green-500 dark:text-green-400";
    @Input() defaultIconClass = "";
    @Input() copiedIconClass = "";

    copied = false;

    get sizeButtonClass(): string {
        return this.size !== "none" ? SIZE_MAP[this.size].button : "";
    }

    get effectiveDefaultIconClass(): string {
        return this.defaultIconClass || (this.size !== "none" ? SIZE_MAP[this.size].icon : "");
    }

    get effectiveCopiedIconClass(): string {
        return this.copiedIconClass || (this.size !== "none" ? SIZE_MAP[this.size].icon : "");
    }

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
