import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: "json",
    standalone: true,
})
export class JsonPipe implements PipeTransform {
    transform(value: Object): string {
        return JSON.stringify(value, null, 4);
    }
}
