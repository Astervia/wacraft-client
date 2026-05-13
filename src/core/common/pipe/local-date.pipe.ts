import { Pipe, PipeTransform, inject } from "@angular/core";
import { LocalSettingsService } from "../../../app/local-settings.service";

@Pipe({
    name: "localDate",
    standalone: true,
})
export class LocalDatePipe implements PipeTransform {
    private localSettings = inject(LocalSettingsService);

    transform(value: string | Date | null | undefined): string {
        if (!value) return "";
        const date = new Date(value);
        if (isNaN(date.getTime())) return "";
        try {
            return date.toLocaleString(this.localSettings.locale, {
                dateStyle: "short",
                timeStyle: "short",
            });
        } catch {
            return date.toLocaleString(navigator.language || "en-US", {
                dateStyle: "short",
                timeStyle: "short",
            });
        }
    }
}
