import { CommonModule } from "@angular/common";
import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    inject,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HeaderType } from "../../../core/message/model/header-type.model";
import { InteractiveType } from "../../../core/message/model/interactive-type.model";
import { MessageFields } from "../../../core/message/entity/message.entity";
import { MessageControllerService } from "../../../core/message/controller/message-controller.service";
import { MediaControllerService } from "../../../core/media/controller/media-controller.service";
import { SectionData } from "../../../core/message/model/section-data.model";
import { InteractiveData } from "../../../core/message/model/interactive-data.model";
import { InteractiveButtonType } from "../../../core/message/model/button-data.model";
import { MessageType } from "../../../core/message/model/message-type.model";
import { SenderData } from "../../../core/message/model/sender-data.model";
import { SentMessageEvent } from "../../../core/message/model/sent-message-event.model";
import { Context } from "../../../core/message/model/context.model";
import { MatIconModule } from "@angular/material/icon";
import { MediaMessageFileUploadComponent } from "../../messages/media-message-file-upload/media-message-file-upload.component";

@Component({
    selector: "app-interactive-message-builder",
    imports: [FormsModule, CommonModule, MatIconModule, MediaMessageFileUploadComponent],
    templateUrl: "./interactive-message-builder.component.html",
    styleUrl: "./interactive-message-builder.component.scss",
    preserveWhitespaces: false,
    standalone: true,
})
export class InteractiveMessageBuilderComponent {
    private messageController = inject(MessageControllerService);
    private mediaController = inject(MediaControllerService);

    HeaderType = HeaderType;
    InteractiveType = InteractiveType;

    interactiveHeaderString = "";
    singleButtonText = "";
    totalRows = 0;
    selectedFile?: File;
    link = "";
    mediaByUrl = false;

    @ViewChild("interactiveBodyArea")
    interactiveBodyArea!: ElementRef<HTMLTextAreaElement>;
    @ViewChild("headerMediaLinkArea")
    headerMediaLinkArea!: ElementRef<HTMLTextAreaElement>;
    @Input("toId") toIdInput!: string;
    @Input("toPhoneNumber") toPhoneNumberInput!: string;
    @Output() sent = new EventEmitter<SentMessageEvent>();
    @Output() typing = new EventEmitter<void>();

    // Interactive Message Fields
    interactiveType: InteractiveType = InteractiveType.button; // default interactive type
    interactiveHeaderType: HeaderType = HeaderType.text;
    interactiveBody = "";
    interactiveFooter = "";
    interactiveButtons: { id: string; title: string }[] = [{ id: "button_1", title: "" }];
    interactiveSections: SectionData[] = [
        {
            title: "",
            rows: [],
        },
    ];

    senderData: SenderData = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: this.toPhoneNumberInput,
        type: MessageType.interactive,
    };

    errors: Record<string, string> = {};

    adjustHeight(area: HTMLTextAreaElement): void {
        if (!area) return;
        area.style.height = "auto"; // Reset height to auto to get the correct scrollHeight
        area.style.height = `${area.scrollHeight}px`; // Set height to scrollHeight
    }

    /**
     * Notifies parent component that user is typing
     */
    onTyping(): void {
        this.typing.emit();
    }

    async buildInteractive() {
        let link: string | undefined = undefined;
        let id: string | undefined = undefined;

        if (this.interactiveHeaderType && this.interactiveHeaderType !== HeaderType.text) {
            if (this.selectedFile) {
                const mimeType = this.selectedFile.type;
                try {
                    const uploadResponse = await this.mediaController.uploadMedia(
                        this.selectedFile,
                        mimeType,
                    );
                    id = uploadResponse.id;
                } catch (error) {
                    this.errors["media"] = "Failed to upload media.";
                    return Promise.reject(error);
                }
            } else {
                link = this.link;
            }
        }

        // Prepare interactive payload
        const interactivePayload: InteractiveData = {
            type: this.interactiveType,
            header: {
                type: this.interactiveHeaderType,
                ...(this.interactiveHeaderType === HeaderType.text
                    ? {
                          text: this.interactiveHeaderString,
                      }
                    : {
                          [this.interactiveHeaderType]: {
                              link,
                              id,
                          },
                      }),
            },
            body: {
                text: this.interactiveBody,
            },
            footer: {
                text: this.interactiveFooter,
            },
        };

        if (this.interactiveType === InteractiveType.button)
            interactivePayload.action = {
                buttons: this.interactiveButtons.map(button => ({
                    type: InteractiveButtonType.reply,
                    reply: {
                        title: button.title,
                        id: button.id,
                    },
                })),
            };
        else
            interactivePayload.action = {
                button: this.singleButtonText,
                sections: this.interactiveSections,
            };

        this.senderData.interactive = interactivePayload;
        this.senderData.type = MessageType.interactive;
        this.senderData.text = undefined;
    }

    async sendInteractive(context?: Context): Promise<MessageFields> {
        await this.buildInteractive();

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
            const data = await httpResponse;

            this.resetForm();
            return data;
        } catch (error) {
            // Handle errors if needed
            return Promise.reject(error);
        } finally {
            setTimeout(() => {
                this.adjustHeight(this.headerMediaLinkArea.nativeElement);
                this.adjustHeight(this.interactiveBodyArea.nativeElement);
            });
        }
    }

    validate() {
        switch (this.interactiveType) {
            case InteractiveType.button:
                return this.interactiveButtons.reduce((acc, button) => {
                    if (!button.title) {
                        this.errors["interactive"] = "Button title is required.";
                        return false;
                    }
                    return acc;
                }, true);
            case InteractiveType.list:
                if (!this.singleButtonText) return false;
                return this.interactiveSections.every(section => {
                    if (this.interactiveSections.length > 1 && !section.title) return false;
                    return section.rows.every(row => row.title !== "");
                });
        }
        return false;
    }

    // Interactive Message Methods
    addButton() {
        const newButtonId = `button_${this.interactiveButtons.length + 1}`;
        this.interactiveButtons.push({ id: newButtonId, title: "" });
    }

    addSection() {
        this.interactiveSections.push({
            title: "",
            rows: [],
        });
    }

    addRow(sectionIndex: number) {
        this.interactiveSections[sectionIndex].rows.push({
            id: `row_${this.interactiveSections[sectionIndex].rows.length + 1}`,
            title: "",
            description: "",
        });
        this.totalRows++;
    }

    removeButton(index: number) {
        this.interactiveButtons.splice(index, 1);
    }

    removeSection(index: number) {
        this.interactiveSections.splice(index, 1);
    }

    removeRow(sectionIndex: number, index: number) {
        const section = this.interactiveSections[sectionIndex];
        if (section.rows.length <= index) return;
        this.interactiveSections[sectionIndex].rows.splice(index, 1);
        this.totalRows--;
    }

    resetForm() {
        this.interactiveType = InteractiveType.button;
        this.interactiveHeaderType = HeaderType.text;
        this.interactiveBody = "";
        this.interactiveFooter = "";
        this.interactiveButtons = [{ id: "button_1", title: "" }];
        this.interactiveSections = [{ title: "", rows: [] }];
        this.errors = {};
    }

    selectInteractive() {
        if (this.interactiveType === InteractiveType.list)
            this.interactiveHeaderType = HeaderType.text;
    }

    onMediaModeChange(event: string) {
        this.mediaByUrl = event === "true";
    }

    onFileSelected(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.files || target.files.length <= 0) return (this.selectedFile = undefined);

        this.selectedFile = target.files[0];
    }
}
