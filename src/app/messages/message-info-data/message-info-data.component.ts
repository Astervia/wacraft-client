import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    Output,
    inject,
} from "@angular/core";
import { NGXLogger } from "ngx-logger";
import { JsonPipe } from "../../../core/common/pipe/json.pipe";
import { JsonViewerComponent } from "../../common/json-viewer/json-viewer.component";
import { CommonModule as AngularCommonModule } from "@angular/common";
import { CommonModule } from "../../../core/common/common.module";
import { MatIconModule } from "@angular/material/icon";

@Component({
    selector: "app-message-info-data",
    imports: [AngularCommonModule, CommonModule, JsonViewerComponent, MatIconModule],
    templateUrl: "./message-info-data.component.html",
    styleUrl: "./message-info-data.component.scss",
    standalone: true,
})
export class MessageInfoDataComponent {
    private jsonPipe = inject(JsonPipe);
    private logger = inject(NGXLogger);
    private elementRef = inject(ElementRef);

    @Input() message: unknown;
    @Output() closeModal = new EventEmitter<void>();
    copied = false;

    close() {
        this.closeModal.emit();
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.jsonPipe.transform(this.message));
            this.copied = true;
        } catch (err) {
            this.logger.error("Failed to copy message: ", err);
        }
    }

    @HostListener("document:click", ["$event"])
    private onDocumentClick(event: MouseEvent) {
        const clickedInside = this.elementRef.nativeElement.contains(event.target);
        if (!clickedInside) this.close();
    }

    @HostListener("keydown.shift.escape")
    private onShiftEscape() {
        this.close();
    }
}
