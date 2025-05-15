import { CommonModule } from "@angular/common";
import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild,
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
import { Context } from "../../../core/message/model/context.model";
import { MatIconModule } from "@angular/material/icon";
import { FileUploadComponent } from "../../common/file-upload/file-upload.component";

@Component({
    selector: "app-interactive-message-builder",
    imports: [FormsModule, CommonModule, MatIconModule, FileUploadComponent],
    templateUrl: "./interactive-message-builder.component.html",
    styleUrl: "./interactive-message-builder.component.scss",
    preserveWhitespaces: false,
    standalone: true,
})
export class InteractiveMessageBuilderComponent {
    HeaderType = HeaderType;
    InteractiveType = InteractiveType;

    interactiveHeaderString: string = "";
    singleButtonText: string = "";
    totalRows: number = 0;
    selectedFile?: File;
    link: string = "";
    caption: string = "";
    mediaByUrl: boolean = false;

    @ViewChild("interactiveBodyArea")
    interactiveBodyArea!: ElementRef<HTMLTextAreaElement>;
    @ViewChild("headerMediaLinkArea")
    headerMediaLinkArea!: ElementRef<HTMLTextAreaElement>;
    @ViewChild("headerMediaCaptionArea")
    headerMediaCaptionArea!: HTMLTextAreaElement;
    @Input("toId") toIdInput!: string;
    @Input("toPhoneNumber") toPhoneNumberInput!: string;
    @Output("sent") sent = new EventEmitter<SenderData>();

    // Interactive Message Fields
    interactiveType: InteractiveType = InteractiveType.button; // default interactive type
    interactiveHeaderType: HeaderType = HeaderType.text;
    interactiveBody: string = "";
    interactiveFooter: string = "";
    interactiveButtons: Array<{ id: string; title: string }> = [
        { id: "button_1", title: "" },
    ];
    interactiveSections: Array<SectionData> = [
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

    errors: { [key: string]: string } = {};

    constructor(
        private messageController: MessageControllerService,
        private mediaController: MediaControllerService,
    ) {}

    adjustHeight(area: HTMLTextAreaElement): void {
        if (!area) return;
        area.style.height = "auto"; // Reset height to auto to get the correct scrollHeight
        area.style.height = `${area.scrollHeight}px`; // Set height to scrollHeight
    }

    async buildInteractive() {
        let link: string | undefined = undefined;
        let id: string | undefined = undefined;
        let filename: string | undefined = undefined;

        if (
            this.interactiveHeaderType &&
            this.interactiveHeaderType !== HeaderType.text
        ) {
            if (this.selectedFile) {
                const mimeType = this.selectedFile.type;
                try {
                    const uploadResponse =
                        await this.mediaController.uploadMedia(
                            this.selectedFile,
                            mimeType,
                        );
                    id = uploadResponse.id;
                    filename = this.selectedFile.name;
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
                              caption:
                                  this.caption === ""
                                      ? undefined
                                      : this.caption,
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
                buttons: this.interactiveButtons.map((button) => ({
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

        this.sent.emit(payload.sender_data);
        this.resetForm();

        try {
            const data =
                await this.messageController.sendWhatsAppMessage(payload);

            this.resetForm();
            return data;
        } catch (error) {
            // Handle errors if needed
            return Promise.reject(error);
        } finally {
            setTimeout(() => {
                this.adjustHeight(this.headerMediaCaptionArea);
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
                        this.errors["interactive"] =
                            "Button title is required.";
                        return false;
                    }
                    return acc;
                }, true);
            case InteractiveType.list:
                if (!this.singleButtonText) return false;
                return this.interactiveSections.every((section) => {
                    if (this.interactiveSections.length > 1 && !section.title)
                        return false;
                    return section.rows.every((row) => row.title !== "");
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
        if (!target.files || target.files.length > 0)
            return (this.selectedFile = undefined);

        this.selectedFile = target.files[0];
    }
}
