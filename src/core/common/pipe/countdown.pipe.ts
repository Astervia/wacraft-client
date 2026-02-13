import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: "countdown",
    standalone: true,
})
export class CountdownPipe implements PipeTransform {
    transform(totalSeconds: number): string {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes > 0) {
            return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
        }
        return `${seconds}s`;
    }
}
