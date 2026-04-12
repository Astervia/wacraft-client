import { Injectable, inject } from "@angular/core";
import { MainServerControllerService } from "../../common/controller/main-server-controller.service";
import { ServerEndpoints } from "../../common/constant/server-endpoints.enum";
import { MediaInfo } from "../model/media-info.model";
import { DomSanitizer } from "@angular/platform-browser";

@Injectable({
    providedIn: "root",
})
export class MediaControllerService extends MainServerControllerService {
    private sanitizer = inject(DomSanitizer);

    constructor() {
        super();
        this.setPath(ServerEndpoints.media, ServerEndpoints.whatsapp);
        this.setHttp();
    }

    // Get Media URL by media ID
    async getMediaUrl(mediaId: string): Promise<MediaInfo> {
        return (await this.http.get<MediaInfo>(`${this.path}/${mediaId}`)).data;
    }

    // Download media by media ID and get SafeUrl to display in browser
    async downloadMediaById(mediaId: string): Promise<string> {
        const response = await this.http.get(`/download/${mediaId}`, {
            responseType: "blob",
        });
        return this.createSafeUrl(response.data);
    }

    // Download media using MediaInfo and get SafeUrl to display in browser
    async downloadMediaByInfo(mediaInfo: MediaInfo): Promise<string> {
        const response = await this.http.post(`/media-info/download`, mediaInfo, {
            responseType: "blob",
        });
        return this.createSafeUrl(response.data);
    }

    // Download media by media ID to save on PC
    async saveMediaById(mediaId: string): Promise<void> {
        const response = await this.http.get(`/download/${mediaId}`, {
            responseType: "blob",
        });
        this.downloadFile(response.data, mediaId);
    }

    // Download media using MediaInfo to save on PC
    async saveMediaByInfo(mediaInfo: MediaInfo): Promise<void> {
        const response = await this.http.post(`/media-info/download`, mediaInfo, {
            responseType: "blob",
        });
        this.downloadFile(response.data, mediaInfo.id);
    }

    // Upload media file
    async uploadMedia(file: File, mimeType: string): Promise<{ id: string }> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", mimeType); // Add MIME type to the form data

        // Send the form data to the server
        return (
            await this.http.post<{ id: string }>(`/upload`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            })
        ).data;
    }

    // Helper function to create a SafeUrl for display in browser
    private createSafeUrl(blob: Blob): string {
        const url = window.URL.createObjectURL(blob);
        return this.sanitizer.sanitize(4, url) || "";
    }

    // Helper function to trigger file download
    private downloadFile(blob: Blob, filename: string): void {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor); // Required for Firefox
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url); // Clean up
    }
}
