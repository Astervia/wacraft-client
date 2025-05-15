import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { SmallButtonComponent } from "../../common/small-button/small-button.component";
import { ConversationMessagingProductContact } from "../../../core/message/model/conversation.model";
import { RouterModule } from "@angular/router";
import { OptionsComponent } from "./options/options.component";
import { contactDetailsQueryParams } from "./constant/query-params.constant";

@Component({
    selector: "app-conversation-header",
    imports: [
        CommonModule,
        SmallButtonComponent,
        RouterModule,
        OptionsComponent,
    ],
    templateUrl: "./conversation-header.component.html",
    styleUrl: "./conversation-header.component.scss",
    standalone: true,
})
export class ConversationHeaderComponent {
    optionsModalOpen: boolean = false;

    @Input("messagingProductContact")
    messagingProductContact!: ConversationMessagingProductContact;
    @Output() searchAtContactId = new EventEmitter<string>();

    constructor() {}

    contactDetailsQueryParams = contactDetailsQueryParams;

    searchAtContact(): void {
        this.searchAtContactId.emit(this.messagingProductContact.id);
        this.optionsModalOpen = false;
    }
}
