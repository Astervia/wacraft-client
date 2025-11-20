import { Component, Input } from "@angular/core";
import { MessagePreviewPipe } from "../../../core/message/pipe/message-preview.pipe";

import { SenderData } from "../../../core/message/model/sender-data.model";
import { ReceiverData } from "../../../core/message/model/receiver-data.model";
import { MatIconModule } from "@angular/material/icon";

@Component({
    selector: "app-message-content-preview",
    imports: [MessagePreviewPipe, MatIconModule],
    templateUrl: "./message-content-preview.component.html",
    styleUrl: "./message-content-preview.component.scss",
    standalone: true,
})
export class MessageContentPreviewComponent {
    @Input() message!: SenderData | ReceiverData;
}
