import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    OnInit,
    AfterViewInit,
    NgZone,
    inject,
} from "@angular/core";
import { SenderData } from "../../../core/message/model/sender-data.model";
import { SentMessageEvent } from "../../../core/message/model/sent-message-event.model";
import { MessageType } from "../../../core/message/model/message-type.model";
import { MessageControllerService } from "../../../core/message/controller/message-controller.service";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { GoogleMapsModule } from "@angular/google-maps";
import { Context } from "../../../core/message/model/context.model";
import { NGXLogger } from "ngx-logger";

@Component({
    selector: "app-location-message-builder",
    imports: [CommonModule, FormsModule, GoogleMapsModule],
    templateUrl: "./location-message-builder.component.html",
    styleUrl: "./location-message-builder.component.scss",
    standalone: true,
})
export class LocationMessageBuilderComponent implements OnInit, AfterViewInit {
    private messageController = inject(MessageControllerService);
    private ngZone = inject(NgZone);
    private logger = inject(NGXLogger);

    @Input("toId") toIdInput!: string;
    @Input("toPhoneNumber") toPhoneNumberInput!: string;
    @Output() sent = new EventEmitter<SentMessageEvent>();

    @ViewChild("nameArea") nameArea!: ElementRef<HTMLTextAreaElement>;
    @ViewChild("addressArea") addressArea!: ElementRef<HTMLTextAreaElement>;
    @ViewChild("searchInput") searchInput!: ElementRef<HTMLInputElement>;

    locationType: "self" | "map" = "self";
    name = "";
    address = "";

    senderData: SenderData = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: this.toPhoneNumberInput,
        type: MessageType.location,
        location: {
            longitude: 0,
            latitude: 0,
            name: "",
            address: "",
        },
    };

    options?: google.maps.MapOptions;
    markerPosition?: google.maps.LatLngLiteral;
    error = "";

    autocomplete?: google.maps.places.Autocomplete;

    ngOnInit() {
        this.initializeMap();
    }

    ngAfterViewInit() {
        this.initAutocomplete();
    }

    adjustHeight(area: HTMLTextAreaElement): void {
        if (!area) return;
        area.style.height = "auto";
        area.style.height = `${area.scrollHeight}px`;
    }

    initializeMap() {
        if (this.locationType === "self") {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        this.markerPosition = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        this.options = {
                            center: this.markerPosition,
                            zoom: 16,
                        };
                    },
                    error => {
                        this.logger.error("Error getting current position", error);
                        this.error = "Unable to get your current location.";
                    },
                );
            } else {
                this.error = "Geolocation is not supported by this browser.";
            }
        } else {
            this.markerPosition = this.markerPosition || { lat: 0, lng: 0 };
            this.options = {
                center: this.markerPosition,
                zoom: 2,
            };
            this.initAutocomplete();
        }
    }

    onLocationTypeChange() {
        this.error = "";
        this.initializeMap();
    }

    get isMarkerDraggable(): boolean {
        return this.locationType === "map";
    }

    onMapClick(event: google.maps.MapMouseEvent) {
        if (this.locationType === "map" && event.latLng) {
            this.markerPosition = {
                lat: event.latLng.lat(),
                lng: event.latLng.lng(),
            };
        }
    }

    onMarkerDragEnd(event: google.maps.MapMouseEvent) {
        if (event.latLng) {
            this.markerPosition = {
                lat: event.latLng.lat(),
                lng: event.latLng.lng(),
            };
        }
    }

    initAutocomplete() {
        if (this.locationType !== "map") {
            this.logger.log("Autocomplete not initialized");
            return;
        }
        this.logger.log("Autocomplete initialized");

        const autocomplete = new google.maps.places.Autocomplete(this.searchInput.nativeElement, {
            types: ["geocode", "establishment"],
        });

        autocomplete.addListener("place_changed", () => {
            this.ngZone.run(() => {
                const place = autocomplete.getPlace();

                if (place.geometry && place.geometry.location) {
                    this.markerPosition = {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                    };
                    this.options = {
                        center: this.markerPosition,
                        zoom: 16,
                    };
                    // Update name and address
                    this.name = place.name || "";
                    this.address = place.formatted_address || "";
                } else {
                    this.error = "No details available for the selected location.";
                }
            });
        });

        this.autocomplete = autocomplete;
    }

    async buildLocation() {
        if (!this.markerPosition) {
            this.error = "Location is not set.";
            return;
        }

        this.senderData.location = {
            longitude: this.markerPosition.lng,
            latitude: this.markerPosition.lat,
            name: this.name,
            address: this.address,
        };
    }

    async send(context?: Context) {
        await this.buildLocation();

        const payload = {
            to_id: this.toIdInput,
            sender_data: {
                ...this.senderData,
                context,
            },
        };

        const httpResponse = this.messageController.sendWhatsAppMessage(payload);
        this.sent.emit({ senderData: payload.sender_data, httpResponse });
        this.resetForm();

        try {
            await httpResponse;
        } catch (error) {
            this.logger.error("Error sending location message", error);
            this.error = "Failed to send the location message.";
        }
    }

    resetForm() {
        this.name = "";
        this.address = "";
        this.error = "";
        this.searchInput.nativeElement.value = "";
    }
}
