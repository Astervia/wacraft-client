import { Component, Input, OnInit, inject } from "@angular/core";
import { Conversation } from "../../../../core/message/model/conversation.model";
import { CommonModule } from "@angular/common";
import { MessageDataPipe } from "../../../../core/message/pipe/message-data.pipe";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { MessageType } from "../../../../core/message/model/message-type.model";
import { RouterModule } from "@angular/router";
import { MessagingProductContactFromMessagePipe } from "../../../../core/message/pipe/messaging-product-contact-from-message.pipe";
import { LocalSettingsService } from "../../../local-settings.service";
import { UseMedia } from "../../../../core/message/model/media-data.model";
import { MediaStoreService } from "../../../../core/media/store/media-store.service";
import { MatIconModule } from "@angular/material/icon";
import { NGXLogger } from "ngx-logger";

@Component({
    selector: "app-media-preview",
    imports: [CommonModule, MessageDataPipe, MatIconModule, RouterModule],
    templateUrl: "./media-preview.component.html",
    styleUrl: "./media-preview.component.scss",
    standalone: true,
})
export class MediaPreviewComponent implements OnInit {
    private messageDataPipe = inject(MessageDataPipe);
    private messProdcContFromMessagePipe = inject(MessagingProductContactFromMessagePipe);
    private mediaStore = inject(MediaStoreService);
    private sanitizer = inject(DomSanitizer);
    private logger = inject(NGXLogger);
    private localSettings = inject(LocalSettingsService);

    MessageType = MessageType;

    @Input() message!: Conversation;

    mediaSafeUrl: SafeUrl = ""; // Safe URL for media
    options = false;

    async ngOnInit(): Promise<void> {
        await this.handleAutoPreview();
    }

    async setMediaUrl() {
        const mediaData = this.mediaData;
        if (!mediaData) return;
        const url = mediaData?.link;
        if (url) {
            this.mediaSafeUrl = this.sanitizer.bypassSecurityTrustUrl(url); // Sanitize the URL
            return;
        }
        if (!mediaData.id) return;
        this.mediaSafeUrl = await this.mediaStore.downloadMediaById(mediaData.id);
    }

    async downloadMedia() {
        const mediaData = this.mediaData;
        if (!mediaData) return;

        const url = mediaData?.link;
        if (url) {
            const a = document.createElement("a");
            a.href = url;
            a.download = mediaData?.filename || "downloaded_file"; // Optional: set the file name
            a.click();

            return;
        }

        if (!mediaData.id) return;
        const safeUrl: SafeUrl = await this.mediaStore.downloadMediaById(mediaData.id);

        // Convert SafeUrl to a plain string
        const urlString = this.sanitizer.sanitize(4, safeUrl); // 4 represents the URL context

        if (!urlString) {
            this.logger.error("Failed to sanitize the URL");
            return;
        }

        const a = document.createElement("a");
        a.href = urlString;
        a.download = mediaData?.filename || "downloaded_file";
        a.click();
    }

    get mediaData(): UseMedia | undefined {
        const data = this.messageDataPipe.transform(this.message);

        switch (data.type) {
            case MessageType.image:
                return data["image"];
            case MessageType.video:
                return data["video"];
            case MessageType.audio:
                return data["audio"];
            case MessageType.sticker:
                return data["sticker"];
            case MessageType.document:
                return data["document"];
            default:
                return undefined;
        }
    }

    handleMediaClick(): void {
        const messageType = this.messageDataPipe.transform(this.message).type;
        if (messageType !== MessageType.document) {
            this.setMediaUrl();
            return;
        }
        this.downloadMedia();
    }

    get goToMessageQueryParams() {
        return {
            "messaging_product_contact.id": this.messProdcContFromMessagePipe.transform(
                this.message,
            ).id,
            "message.id": this.message.id,
            "message.created_at": this.message.created_at,
        };
    }

    showOptions() {
        this.options = true;
    }

    hideOptions() {
        this.options = false;
    }

    async handleAutoPreview() {
        const type = this.messageDataPipe.transform(this.message).type;
        if (
            !(
                type === MessageType.image ||
                type === MessageType.video ||
                type === MessageType.audio ||
                type === MessageType.sticker
            )
        )
            return;
        const autoPreview = this.localSettings.autoPreview[`${type}`];
        if (!autoPreview) return;
        return await this.setMediaUrl();
    }
}
