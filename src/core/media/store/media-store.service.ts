import { Injectable } from "@angular/core";
import { MediaInfo } from "../model/media-info.model";
import { MediaControllerService } from "../controller/media-controller.service";
import { SafeUrl } from "@angular/platform-browser";

@Injectable({
    providedIn: "root",
})
export class MediaStoreService {
    mediaInfos = new Map<string, MediaInfo>();
    mediaSafeURLs = new Map<string, SafeUrl>();

    constructor(private mediaController: MediaControllerService) {}

    async getMediaURL(mediaId: string): Promise<MediaInfo> {
        const info = this.mediaInfos.get(mediaId);
        if (info) return info;
        const newInfo = await this.mediaController.getMediaUrl(mediaId);
        this.mediaInfos.set(mediaId, newInfo);
        return newInfo;
    }

    async downloadMediaById(mediaId: string): Promise<SafeUrl> {
        const safeUrl = this.mediaSafeURLs.get(mediaId);
        if (safeUrl) return safeUrl;
        const newSafeUrl =
            await this.mediaController.downloadMediaById(mediaId);
        this.mediaSafeURLs.set(mediaId, newSafeUrl);
        return newSafeUrl;
    }
}
