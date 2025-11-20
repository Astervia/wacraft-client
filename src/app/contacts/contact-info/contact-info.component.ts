import { Component, EventEmitter, Input, OnInit, Output, ViewChild, inject } from "@angular/core";
import {
    Conversation,
    ConversationMessagingProductContact,
} from "../../../core/message/model/conversation.model";

import { FormControl, FormsModule, NgForm, ReactiveFormsModule, Validators } from "@angular/forms";
import { ContactControllerService } from "../../../core/contact/controller/contact-controller.service";
import { MessagingProductContactControllerService } from "../../../core/messaging-product/controller/messaging-product-contact-controller.service";
import { SmallButtonComponent } from "../../common/small-button/small-button.component";
import { ConversationControllerService } from "../../../core/message/controller/conversation-controller.service";
import { DateOrderEnum } from "../../../core/common/model/date-order.model";
import { MediaPreviewComponent } from "./media-preview/media-preview.component";
import { Router, RouterModule } from "@angular/router";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { NGXLogger } from "ngx-logger";
import { MatFormFieldModule } from "@angular/material/form-field";
import { NgxIntlTelInputModule } from "ngx-intl-tel-input";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";

@Component({
    selector: "app-contact-info",
    imports: [
        FormsModule,
        SmallButtonComponent,
        MediaPreviewComponent,
        TimeoutErrorModalComponent,
        MatIconModule,
        RouterModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        NgxIntlTelInputModule,
    ],
    templateUrl: "./contact-info.component.html",
    styleUrls: ["./contact-info.component.scss"],
    // encapsulation: ViewEncapsulation.None,
    standalone: true,
})
export class ContactInfoComponent implements OnInit {
    private contactControllerService = inject(ContactControllerService);
    private messagingProductContactController = inject(MessagingProductContactControllerService);
    private conversationController = inject(ConversationControllerService);
    private queryParamsService = inject(QueryParamsService);
    private router = inject(Router);
    private logger = inject(NGXLogger);

    // Existing properties
    isEditing = false;
    isLoading = false; // General loading state
    originalContact: ConversationMessagingProductContact | null = null;
    quantityOfMediaLinksAndDocs = 0;
    media: Conversation[] = [];

    @Input() messagingProductContact!: ConversationMessagingProductContact;
    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    isDeleting = false;
    isBlocking = false;
    isUnblocking = false;

    private static readonly EMPTY_PHONE_VALUE = {
        number: "",
        countryCode: "",
        e164Number: "",
    };

    phoneControl = new FormControl<typeof ContactInfoComponent.EMPTY_PHONE_VALUE | null>(null, [
        Validators.required,
    ]);

    async ngOnInit(): Promise<void> {
        this.isLoading = true; // Start general loading
        // Reset all error messages
        this.errorStr = "";
        try {
            // this.phoneControl.valueChanges.subscribe((value) => {
            //     this.logger.debug("Phone number changed:", value);
            //     this.messagingProductContact.product_details.phone_number =
            //         value || "";
            // });

            this.phoneControl.valueChanges.subscribe(value => {
                if (!value?.e164Number) return;
                this.messagingProductContact.product_details.phone_number = value?.e164Number || "";
            });

            if (this.messagingProductContact?.id) {
                const rawPhone = this.messagingProductContact?.product_details?.phone_number;

                if (rawPhone) {
                    const phoneNumber = parsePhoneNumberFromString(
                        rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`,
                    );
                    const phoneValueToSet: typeof ContactInfoComponent.EMPTY_PHONE_VALUE = {
                        number: `${phoneNumber?.nationalNumber ?? ""}`,
                        countryCode: phoneNumber?.country ?? "",
                        e164Number: phoneNumber?.number ?? "",
                    };
                    this.phoneControl.setValue(phoneValueToSet);
                }

                // if (rawPhone) {
                //     this.logger.debug("Raw phone number:", rawPhone);
                //     const phoneNumber = parsePhoneNumberFromString(
                //         "+" + rawPhone,
                //     );
                //     this.logger.debug("Phone number:", phoneNumber);
                //     const intlPhoneNumber =
                //         phoneNumber?.formatInternational() || "";
                //     this.logger.debug(
                //         "International phone number:",
                //         intlPhoneNumber,
                //     );
                //     this.phoneControl.setValue(intlPhoneNumber);
                // }

                await Promise.all([this.countMediaLinksAndDocs(), this.getInitialMedia()]);

                this.phoneControl.disable();

                return;
            }

            this.phoneControl.enable();

            // Initialize a new messaging product contact if not present
            this.messagingProductContact = {
                id: "",
                contact_id: "",
                messaging_product_id: "",
                blocked: false,
                product_details: {
                    phone_number: "",
                    wa_id: "",
                },
                created_at: new Date(),
                updated_at: new Date(),
                last_read_at: new Date(),
                contact: {
                    id: "",
                    created_at: new Date(),
                    updated_at: new Date(),
                    name: "",
                    email: "",
                    photo_path: "",
                },
            };
            this.toggleEdit();
        } catch (error) {
            this.handleErr("Failed to initialize contact info.", error);
        } finally {
            this.isLoading = false; // End general loading
        }
    }

    toggleEdit() {
        if (!this.messagingProductContact?.id) {
            this.isEditing = true;
            this.phoneControl.enable();
            return;
        }
        this.isEditing = !this.isEditing;
        if (this.isEditing) {
            // Deep copy to prevent reference issues
            this.originalContact = JSON.parse(JSON.stringify(this.messagingProductContact));
        }
    }

    @Output() select = new EventEmitter<ConversationMessagingProductContact>();
    async submitChanges(form: NgForm) {
        // Reset general error message
        this.errorStr = "";

        if (form.invalid) {
            // Mark all fields as touched to trigger validation messages
            form.form.markAllAsTouched();
            return;
        }

        this.isLoading = true; // Start general loading
        try {
            if (!this.messagingProductContact?.id) {
                const contact = await this.contactControllerService.create(
                    this.messagingProductContact.contact,
                );
                const phoneNumber =
                    this.messagingProductContact.product_details.phone_number.replace(/\D/g, "");
                const messagingProductContact =
                    await this.messagingProductContactController.createWhatsAppContact({
                        contact_id: contact.id,
                        product_details: {
                            phone_number: phoneNumber,
                            wa_id: phoneNumber,
                        },
                    });

                const mpc = (
                    await this.messagingProductContactController.getWhatsAppContacts(
                        { id: messagingProductContact.id },
                        { limit: 1, offset: 0 },
                    )
                )[0];
                if (!mpc)
                    return await this.router.navigate([], {
                        queryParams: {
                            "messaging_product_contact.id": messagingProductContact.id,
                            mode: "contact_info",
                            ...this.queryParamsService.globalQueryParams,
                        },
                        queryParamsHandling: "replace",
                        preserveFragment: true,
                    });

                this.select.emit(mpc);

                return await this.router.navigate([], {
                    queryParams: {
                        "messaging_product_contact.id": messagingProductContact.id,
                        mode: "contact_info",
                        ...this.queryParamsService.globalQueryParams,
                    },
                    queryParamsHandling: "replace",
                    preserveFragment: true,
                });
            }

            const updateData = {
                id: this.messagingProductContact.contact.id,
                name: this.messagingProductContact.contact.name,
                email: this.messagingProductContact.contact.email,
                photo_path: this.messagingProductContact.contact.photo_path,
            };

            await this.contactControllerService.update(updateData);

            this.isLoading = false; // End general loading
        } catch (error) {
            this.handleErr("Failed to submit changes. Please try again.", error);
        }

        return;
    }

    cancelEdit() {
        if (this.originalContact) {
            // Restore the original contact data
            this.messagingProductContact = this.originalContact;
        }
        this.isEditing = false; // Exit edit mode
    }

    async blockContact() {
        // Reset previous error message
        this.errorStr = "";

        const confirmBlock = window.confirm(
            "Are you sure you want to block this contact? You will not be able to receive any messages from this contact.",
        );
        if (confirmBlock) {
            this.isBlocking = true; // Start blocking loading state
            try {
                await this.messagingProductContactController.block(this.messagingProductContact.id);
                this.messagingProductContact.blocked = true;
            } catch (error) {
                this.handleErr("Failed to block contact. Please try again.", error);
            } finally {
                this.isBlocking = false; // End blocking loading state
            }
        }
    }

    async deleteContact() {
        // Reset previous error message
        this.errorStr = "";

        const confirmDelete = window.confirm(
            "Are you sure you want to delete this contact? All contacts linked to this one in all platforms will be deleted with all messages.",
        );
        if (confirmDelete) {
            this.isDeleting = true; // Start deleting loading state
            try {
                await this.contactControllerService.delete(this.messagingProductContact.contact_id);
                await this.router.navigate(["/home"], { fragment: "chats" });
                window.location.reload();
            } catch (error: unknown) {
                this.handleErr("Failed to delete contact. Please try again.", error);
            } finally {
                this.isDeleting = false; // End deleting loading state
            }
        }
    }

    async deleteWhatsAppContact() {
        // Reset previous error message
        this.errorStr = "";

        const confirmDelete = window.confirm(
            "Are you sure you want to delete this contact? All messages with this contact will be lost.",
        );
        if (confirmDelete) {
            this.isDeleting = true; // Start deleting loading state
            try {
                await this.messagingProductContactController.delete(
                    this.messagingProductContact.contact_id,
                );
                await this.router.navigate(["/home"], { fragment: "chats" });
                window.location.reload();
            } catch (error: unknown) {
                this.handleErr("Failed to delete contact. Please try again.", error);
            } finally {
                this.isDeleting = false; // End deleting loading state
            }
        }
    }

    async unblockContact() {
        // Reset previous error message
        this.errorStr = "";

        this.isUnblocking = true; // Start unblocking loading state
        try {
            await this.messagingProductContactController.unblock(this.messagingProductContact.id);
            this.messagingProductContact.blocked = false;
        } catch (error: unknown) {
            this.handleErr("Failed to unblock contact. Please try again.", error);
        } finally {
            this.isUnblocking = false; // End unblocking loading state
        }
    }

    async countMediaLinksAndDocs() {
        try {
            this.quantityOfMediaLinksAndDocs =
                await this.conversationController.countConversationContentLike(
                    this.messagingProductContact.id,
                    'type:\\s*"(image|video|document)"',
                );
        } catch (error: unknown) {
            this.handleErr("Failed to count media and documents.", error);
        }
    }

    async getInitialMedia() {
        try {
            this.media = await this.conversationController.conversationContentLike(
                this.messagingProductContact.id,
                'type:\\s*"(image|video)"',
                undefined,
                { limit: 5, offset: 0 },
                { created_at: DateOrderEnum.desc },
            );
        } catch (error: unknown) {
            this.handleErr("Failed to load media and documents.", error);
        }
    }

    closeQueryParams = {
        mode: "chat",
    };

    mediaInfoQueryParams = {
        mode: "contact_media",
    };

    errorStr = "";
    errorData: unknown;
    handleErr(message: string, err: unknown) {
        if (isHttpError(err)) {
            this.errorData = err.response?.data;
            this.errorStr = err.response?.data?.description ?? message;
        } else {
            this.errorData = err;
            this.errorStr = message;
        }

        this.logger.error("Async error", err);
        this.errorModal.openModal();
    }
}
