import { Component, EventEmitter, Input, Output } from "@angular/core";

import { isMediaType, MessageType } from "../../../core/message/model/message-type.model";
import { FileUploadComponent } from "../../common/file-upload/file-upload.component";

@Component({
    selector: "app-media-message-file-upload",
    imports: [FileUploadComponent],
    templateUrl: "./media-message-file-upload.component.html",
    styleUrl: "./media-message-file-upload.component.scss",
    standalone: true,
})
export class MediaMessageFileUploadComponent {
    MediaType = MessageType;

    @Output() change = new EventEmitter<Event>();
    @Input() type!: MessageType | string;

    isMediaType = isMediaType;
    acceptedFormats: Partial<Record<MessageType | string, string>> = {
        [MessageType.image]: "JPEG, PNG",
        [MessageType.video]: "MP4 Video, 3GPP",
        [MessageType.audio]: "MP3, MP4 Audio, AAC, AMR, OGG Audio",
        [MessageType.document]: "Text, Microsoft Excel, Microsoft Word, PDF, etc",
        [MessageType.sticker]: "WEBP",
    };
    accept: Partial<Record<MessageType | string, string>> = {
        [MessageType.image]: ".jpg,.jpeg,.png,image/jpeg,image/png",
        [MessageType.video]: ".3gp,.mp4,video/3gpp,video/mp4",
        [MessageType.audio]:
            ".aac,.amr,.mp3,.m4a,.ogg,audio/aac,audio/amr,audio/mpeg,audio/mp4,audio/ogg",
        [MessageType.document]:
            ".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
        [MessageType.sticker]: ".webp,image/webp",
    };
}
