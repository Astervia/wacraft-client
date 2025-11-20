
import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    Output,
    inject,
} from "@angular/core";
import { ContactData } from "../../../core/message/model/contact-data.model";
import { MatIconModule } from "@angular/material/icon";
import { RouterModule } from "@angular/router";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";

@Component({
    selector: "app-message-contacts-modal",
    imports: [MatIconModule, RouterModule],
    templateUrl: "./message-contacts-modal.component.html",
    styleUrl: "./message-contacts-modal.component.scss",
    standalone: true,
})
export class MessageContactsModalComponent {
    queryParamsService = inject(QueryParamsService);
    private elementRef = inject(ElementRef);

    @Input() contacts!: ContactData[];
    @Output() close = new EventEmitter();

    closeModal() {
        this.close.emit();
    }

    get addChatQueryParams() {
        return {
            mode: "new_contact",
            ...this.queryParamsService.globalQueryParams,
        };
    }

    // Shortcuts
    @HostListener("document:click", ["$event"])
    onDocumentClick(event: MouseEvent) {
        const clickedInside = this.elementRef.nativeElement.contains(event.target);
        if (!clickedInside) this.close.emit();
    }
}
