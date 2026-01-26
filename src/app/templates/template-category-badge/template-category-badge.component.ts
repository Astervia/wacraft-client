import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TemplateCategory } from "../../../core/template/model/template.model";

@Component({
    selector: "app-template-category-badge",
    imports: [CommonModule],
    templateUrl: "./template-category-badge.component.html",
    standalone: true,
})
export class TemplateCategoryBadgeComponent {
    @Input() category?: TemplateCategory | string;
    @Input() size: "sm" | "md" = "sm";

    get categoryClass(): string {
        const baseClasses =
            this.size === "sm"
                ? "rounded px-1.5 py-0.5 text-xs font-medium"
                : "rounded-lg px-3 py-1.5 text-sm font-medium";

        switch (this.category) {
            case "MARKETING":
                return `${baseClasses} bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400`;
            case "UTILITY":
                return `${baseClasses} bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400`;
            case "AUTHENTICATION":
            case "OTP":
                return `${baseClasses} bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400`;
            case "TRANSACTIONAL":
            case "PAYMENT_UPDATE":
            case "PERSONAL_FINANCE_UPDATE":
                return `${baseClasses} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400`;
            case "SHIPPING_UPDATE":
            case "TRANSPORTATION_UPDATE":
                return `${baseClasses} bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400`;
            case "APPOINTMENT_UPDATE":
            case "RESERVATION_UPDATE":
            case "TICKET_UPDATE":
                return `${baseClasses} bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400`;
            case "ISSUE_RESOLUTION":
            case "ALERT_UPDATE":
                return `${baseClasses} bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400`;
            case "ACCOUNT_UPDATE":
                return `${baseClasses} bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400`;
            case "AUTO_REPLY":
            case "FREE_SERVICE":
                return `${baseClasses} bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400`;
        }
    }
}
