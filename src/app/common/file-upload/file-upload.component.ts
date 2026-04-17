import { CommonModule } from "@angular/common";
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

@Component({
    selector: "app-file-upload",
    imports: [CommonModule, MatIconModule],
    templateUrl: "./file-upload.component.html",
    styleUrl: "./file-upload.component.scss",
    standalone: true,
})
export class FileUploadComponent {
    @Output() change = new EventEmitter<Event>();
    @Input() acceptedFormats?: string = "";
    uploadedFileName: string | null = null;
    isDragOver = false;

    @ViewChild("fileInput") fileInput?: ElementRef<HTMLInputElement>;

    onFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        this.selectFiles(input.files ?? undefined);
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        this.isDragOver = true;
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        this.isDragOver = false;
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        this.isDragOver = false;
        this.selectFiles(event.dataTransfer?.files);
    }

    clearFile() {
        if (this.fileInput) this.fileInput.nativeElement.value = "";
        this.clearSelection();
    }

    clearSelection() {
        this.uploadedFileName = null;
        this.change.emit({ target: { files: [] } } as unknown as Event);
    }

    private selectFiles(files?: FileList | File[]) {
        if (files && files.length > 0) {
            this.uploadedFileName = files[0].name;
            this.change.emit({ target: { files } } as unknown as Event);
            return;
        }

        this.clearSelection();
    }
}
