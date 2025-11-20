import { Component, Input } from "@angular/core";

import { ReceivedContext } from "../../../core/message/model/received-context.model";
import { MatIconModule } from "@angular/material/icon";

@Component({
    selector: "app-message-forwarded-header",
    imports: [MatIconModule],
    templateUrl: "./message-forwarded-header.component.html",
    styleUrl: "./message-forwarded-header.component.scss",
    standalone: true,
})
export class MessageForwardedHeaderComponent {
    @Input() context?: ReceivedContext;
}
