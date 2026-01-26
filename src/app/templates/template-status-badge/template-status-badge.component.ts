import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TemplateStatus } from "../../../core/template/model/template.model";

@Component({
    selector: "app-template-status-badge",
    imports: [CommonModule],
    templateUrl: "./template-status-badge.component.html",
    standalone: true,
})
export class TemplateStatusBadgeComponent {
    @Input() status?: TemplateStatus | string;
    @Input() size: "sm" | "md" = "sm";

    get statusClass(): string {
        const baseClasses =
            this.size === "sm"
                ? "rounded-full px-2 py-0.5 text-xs font-medium"
                : "rounded-lg px-3 py-1.5 text-sm font-medium";

        switch (this.status) {
            case "APPROVED":
                return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400`;
            case "PENDING":
            case "IN_APPEAL":
                return `${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400`;
            case "REJECTED":
            case "DELETED":
            case "PENDING_DELETION":
                return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400`;
            case "DISABLED":
            case "PAUSED":
            case "ARCHIVED":
                return `${baseClasses} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400`;
            case "LIMIT_EXCEEDED":
                return `${baseClasses} bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400`;
        }
    }
}
