import {
    Component,
    Input,
    OnInit,
    OnDestroy,
    inject,
    ElementRef,
    ViewChild,
    AfterViewInit,
} from "@angular/core";
import { Conversation } from "../../../core/message/model/conversation.model";

import { MessageDataPipe } from "../../../core/message/pipe/message-data.pipe";
import { MessageType } from "../../../core/message/model/message-type.model";
import { GoogleMapsModule } from "@angular/google-maps";
import { environment } from "../../../environments/environment";
import * as L from "leaflet";

@Component({
    selector: "app-message-location-content",
    imports: [MessageDataPipe, GoogleMapsModule],
    templateUrl: "./message-location-content.component.html",
    styleUrl: "./message-location-content.component.scss",
    standalone: true,
})
export class MessageLocationContentComponent implements OnInit, OnDestroy, AfterViewInit {
    private messageDataPipe = inject(MessageDataPipe);

    MessageType = MessageType;

    @Input() message!: Conversation;
    @Input() isSent!: boolean;
    @Input() sent = true;

    @ViewChild("osmMap") osmMapElement?: ElementRef<HTMLDivElement>;

    // Google Maps properties
    options?: google.maps.MapOptions;
    markerPosition?: google.maps.LatLngLiteral;

    // OpenStreetMap properties
    private leafletMap?: L.Map;
    private leafletMarker?: L.Marker;

    // Flag to determine which map to use (check for valid API key, not "undefined" string)
    useGoogleMaps = !!environment.googleMapsApiKey && environment.googleMapsApiKey !== "undefined";

    private latitude = 0;
    private longitude = 0;

    ngOnInit() {
        this.latitude = this.messageDataPipe.transform(this.message)?.location?.latitude || 0;
        this.longitude = this.messageDataPipe.transform(this.message)?.location?.longitude || 0;

        if (this.useGoogleMaps) {
            this.initGoogleMaps();
        }
    }

    ngAfterViewInit() {
        if (!this.useGoogleMaps) {
            this.initOpenStreetMap();
        }
    }

    ngOnDestroy() {
        if (this.leafletMap) {
            this.leafletMap.remove();
        }
    }

    private initGoogleMaps() {
        this.options = {
            center: { lat: this.latitude, lng: this.longitude },
            zoom: 16,
        };
        this.markerPosition = { lat: this.latitude, lng: this.longitude };
    }

    private initOpenStreetMap() {
        if (!this.osmMapElement?.nativeElement) return;

        this.leafletMap = L.map(this.osmMapElement.nativeElement).setView(
            [this.latitude, this.longitude],
            16,
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.leafletMap);

        // Custom marker icon to fix default icon issue
        const defaultIcon = L.icon({
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });

        this.leafletMarker = L.marker([this.latitude, this.longitude], { icon: defaultIcon }).addTo(
            this.leafletMap,
        );
    }
}
