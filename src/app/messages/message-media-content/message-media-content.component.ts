import { CommonModule } from "@angular/common";
import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
    SecurityContext,
    ViewChild,
    inject,
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { MessageType, ReceivedMessageType } from "../../../core/message/model/message-type.model";
import { LocalSettingsService } from "../../local-settings.service";
import { UseMedia } from "../../../core/message/model/media-data.model";
import { MediaStoreService } from "../../../core/media/store/media-store.service";
import { MatIconModule } from "@angular/material/icon";
import { NGXLogger } from "ngx-logger";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-message-media-content",
    imports: [CommonModule, MatIconModule, TimeoutErrorModalComponent],
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

    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    mediaSafeUrl = "";

    async ngOnInit(): Promise<void> {
        await this.handleAutoPreview();
        this.asyncContentLoaded.emit();
    }

    async setMediaUrl() {
        if (!this.mediaData) return;
        const url = this.mediaData?.link;
        if (url) {
            const sanitizedUrl = this.sanitizer.sanitize(SecurityContext.URL, url); // Sanitize the URL
            if (sanitizedUrl) {
                this.mediaSafeUrl = sanitizedUrl;
            } else {
                this.logger.error("Failed to sanitize the URL for preview");
            }
            return;
        }
        if (!this.mediaData.id) return;
        try {
            this.mediaSafeUrl = await this.mediaStore.downloadMediaById(this.mediaData.id);
        } catch (error) {
            this.handleErr("Failed to load media. Please try again.", error);
        }
    }

    async downloadMedia() {
        if (!this.mediaData) return;

        const url = this.mediaData?.link;
        if (url) {
            const sanitizedUrl = this.sanitizer.sanitize(SecurityContext.URL, url);
            if (!sanitizedUrl) {
                this.logger.error("Failed to sanitize the URL for download");
                return;
            }

            const a = document.createElement("a");
            a.href = sanitizedUrl;
            a.download = this.mediaData?.filename || "downloaded_file"; // Optional: set the file name
            a.click();

            return;
        }

        if (!this.mediaData.id) return;
        let urlString: string;
        try {
            urlString = await this.mediaStore.downloadMediaById(this.mediaData.id);
        } catch (error) {
            this.handleErr("Failed to download media. Please try again.", error);
            return;
        }

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

    errorStr = "";
    errorData: unknown;
    handleErr(message: string, err: unknown) {
        if (isHttpError(err)) {
            this.errorData = err.response?.data;
            this.errorStr = err.response?.data?.description ?? message;
        } else {
            this.errorData = err;
            this.errorStr = message;
        }

        this.logger.error("Async error", err);
        this.errorModal.openModal();
    }
}
