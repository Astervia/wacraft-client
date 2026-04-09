import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnInit, Output, inject } from "@angular/core";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { MessageType, ReceivedMessageType } from "../../../core/message/model/message-type.model";
import { LocalSettingsService } from "../../local-settings.service";
import { UseMedia } from "../../../core/message/model/media-data.model";
import { MediaStoreService } from "../../../core/media/store/media-store.service";
import { MatIconModule } from "@angular/material/icon";
import { NGXLogger } from "ngx-logger";

@Component({
    selector: "app-message-media-content",
    imports: [CommonModule, MatIconModule],
    templateUrl: "./message-media-content.component.html",
    styleUrl: "./message-media-content.component.scss",
    standalone: true,
})
export class MessageMediaContentComponent implements OnInit {
    private mediaStore = inject(MediaStoreService);
    private sanitizer = inject(DomSanitizer);
    private localSettings = inject(LocalSettingsService);
    private logger = inject(NGXLogger);

    MessageType = MessageType;

    @Input() mediaData!: UseMedia;
    @Input() messageType!: MessageType | ReceivedMessageType;
    @Input() isSent!: boolean;
    @Output() asyncContentLoaded = new EventEmitter();

    mediaSafeUrl: SafeUrl = "";

    async ngOnInit(): Promise<void> {
        await this.handleAutoPreview();
        this.asyncContentLoaded.emit();
    }

    async setMediaUrl() {
        if (!this.mediaData) return;
        const url = this.mediaData?.link;
        if (url) {
            this.mediaSafeUrl = this.sanitizer.bypassSecurityTrustUrl(url); // Sanitize the URL
            return;
        }
        if (!this.mediaData.id) return;
        this.mediaSafeUrl = await this.mediaStore.downloadMediaById(this.mediaData.id);
    }

    async downloadMedia() {
        if (!this.mediaData) return;

        const url = this.mediaData?.link;
        if (url) {
            const a = document.createElement("a");
            a.href = url;
            a.download = this.mediaData?.filename || "downloaded_file"; // Optional: set the file name
            a.click();

            return;
        }

        if (!this.mediaData.id) return;
        const safeUrl: SafeUrl = await this.mediaStore.downloadMediaById(this.mediaData.id);

        // Convert SafeUrl to a plain string
        const urlString = this.sanitizer.sanitize(4, safeUrl); // 4 represents the URL context

        if (!urlString) {
            this.logger.error("Failed to sanitize the URL");
            return;
        }

        const a = document.createElement("a");
        a.href = urlString;
        a.download = this.mediaData?.filename || "downloaded_file";
        a.click();
    }

    handleMediaClick(): void {
        if (this.messageType !== MessageType.document) {
            this.setMediaUrl();
            return;
        }
        this.downloadMedia();
    }

    options = false;
    showOptions() {
        this.options = true;
    }
    hideOptions() {
        this.options = false;
    }

    async handleAutoPreview() {
        if (
            !(
                this.messageType === MessageType.image ||
                this.messageType === MessageType.video ||
                this.messageType === MessageType.audio ||
                this.messageType === MessageType.sticker
            )
        )
            return;
        const autoPreview = this.localSettings.autoPreview[`${this.messageType}`];
        if (!autoPreview) return;
        return await this.setMediaUrl();
    }
}
