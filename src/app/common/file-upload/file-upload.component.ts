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
    @Input() accept?: string;
    uploadedFileName: string | null = null;
    isDragOver = false;
    hasInvalidType = false;

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
        this.hasInvalidType = false;
        this.change.emit({ target: { files: [] } } as unknown as Event);
    }

    private selectFiles(files?: FileList | File[]) {
        if (files && files.length > 0) {
            const fileArray = Array.from(files);
            const invalid = fileArray.find(file => !this.fileMatchesAccept(file));
            if (invalid) {
                this.hasInvalidType = true;
                this.uploadedFileName = null;
                if (this.fileInput) this.fileInput.nativeElement.value = "";
                this.change.emit({ target: { files: [] } } as unknown as Event);
                return;
            }

            this.hasInvalidType = false;
            this.uploadedFileName = fileArray[0].name;
            this.change.emit({ target: { files } } as unknown as Event);
            return;
        }

        this.clearSelection();
    }

    private fileMatchesAccept(file: File): boolean {
        if (!this.accept) return true;

        const tokens = this.accept
            .split(",")
            .map(token => token.trim().toLowerCase())
            .filter(Boolean);
        if (tokens.length === 0) return true;

        const fileName = file.name.toLowerCase();
        const fileType = file.type.toLowerCase();

        return tokens.some(token => {
            if (token.startsWith(".")) return fileName.endsWith(token);
            if (token.endsWith("/*")) {
                const prefix = token.slice(0, token.length - 1);
                return fileType.startsWith(prefix);
            }
            return fileType === token;
        });
    }
}
