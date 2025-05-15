import { Component, Input } from "@angular/core";
import { ButtonData } from "../../../core/message/model/button-data.model";
import { CommonModule } from "@angular/common";

@Component({
    selector: "app-message-button-content",
    imports: [CommonModule],
    templateUrl: "./message-button-content.component.html",
    styleUrl: "./message-button-content.component.scss",
    standalone: true,
})
export class MessageButtonContentComponent {
    @Input("buttonData") buttonData!: ButtonData;
    @Input("isSent") isSent!: boolean;
    @Input("sent") sent: boolean = true;
}
