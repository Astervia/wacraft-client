import { Component, Input } from "@angular/core";
import { ButtonData } from "../../../core/message/model/button-data.model";


@Component({
    selector: "app-message-button-content",
    imports: [],
    templateUrl: "./message-button-content.component.html",
    styleUrl: "./message-button-content.component.scss",
    standalone: true,
})
export class MessageButtonContentComponent {
    @Input() buttonData!: ButtonData;
    @Input() isSent!: boolean;
    @Input() sent = true;
}
