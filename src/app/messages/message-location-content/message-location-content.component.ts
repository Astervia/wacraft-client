import { Component, Input, OnInit, inject } from "@angular/core";
import { Conversation } from "../../../core/message/model/conversation.model";

import { MessageDataPipe } from "../../../core/message/pipe/message-data.pipe";
import { MessageType } from "../../../core/message/model/message-type.model";
import { GoogleMapsModule } from "@angular/google-maps";

@Component({
    selector: "app-message-location-content",
    imports: [MessageDataPipe, GoogleMapsModule],
    templateUrl: "./message-location-content.component.html",
    styleUrl: "./message-location-content.component.scss",
    standalone: true,
})
export class MessageLocationContentComponent implements OnInit {
    private messageDataPipe = inject(MessageDataPipe);

    MessageType = MessageType;

    @Input() message!: Conversation;
    @Input() isSent!: boolean;
    @Input() sent = true;

    options?: google.maps.MapOptions;
    markerPosition?: google.maps.LatLngLiteral;

    ngOnInit() {
        const latitude = this.messageDataPipe.transform(this.message)?.location?.latitude || 0;
        const longitude = this.messageDataPipe.transform(this.message)?.location?.longitude || 0;

        // Set map options
        this.options = {
            center: { lat: latitude, lng: longitude },
            zoom: 16,
        };

        // Set the marker position
        this.markerPosition = { lat: latitude, lng: longitude };
    }
}
