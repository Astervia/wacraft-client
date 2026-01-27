import { Component, Input, ViewChild, inject } from "@angular/core";
import { Template } from "../../../core/template/model/template.model";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import {
    ParameterType,
    UseTemplateComponent,
} from "../../../core/message/model/use-template-component.model";
import {
    ComponentExample,
    TemplateComponent,
} from "../../../core/template/model/template-component.model";
import { TemplateComponentType } from "../../../core/template/model/template-component-type.model";
import { TemplateComponentFormat } from "../../../core/template/model/template-component-format.model";
import {
    Conversation,
    ConversationMessagingProductContact,
} from "../../../core/message/model/conversation.model";
import { NIL as NilUUID } from "uuid";
import { MessageType } from "../../../core/message/model/message-type.model";
import { MediaControllerService } from "../../../core/media/controller/media-controller.service";
import { MessageControllerService } from "../../../core/message/controller/message-controller.service";
import { MessageTemplateContentComponent } from "../../messages/message-template-content/message-template-content.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { saveAs } from "file-saver";
import * as Papa from "papaparse";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { MatIconModule } from "@angular/material/icon";
import { MediaMessageFileUploadComponent } from "../../messages/media-message-file-upload/media-message-file-upload.component";
import { ContactsModalComponent } from "../../contacts/contact-modal/contacts-modal.component";
import { NGXLogger } from "ngx-logger";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";
import { UserConversationsStoreService } from "../../../core/message/store/user-conversations-store.service";
import { TemplateComponentTypeConverterPipe } from "../../../core/template/pipe/template-component-type-converter.pipe";
import { TemplateModule } from "../../../core/template/template.module";
import { ButtonSubtype } from "../../../core/message/model/button-subtype.model";

@Component({
    selector: "app-template-message-builder",
    imports: [
        FormsModule,
        CommonModule,
        ContactsModalComponent,
        MessageTemplateContentComponent,
        MatTooltipModule,
        TimeoutErrorModalComponent,
        TemplateModule,
        MatIconModule,
        MediaMessageFileUploadComponent,
    ],
    templateUrl: "./template-message-builder.component.html",
    styleUrl: "./template-message-builder.component.scss",
    standalone: true,
})
export class TemplateMessageBuilderComponent {
    private mediaController = inject(MediaControllerService);
    private messageController = inject(MessageControllerService);
    private logger = inject(NGXLogger);
    private userConversationStore = inject(UserConversationsStoreService);
    private typeConverter = inject(TemplateComponentTypeConverterPipe);

    TemplateComponentType = TemplateComponentType;

    @Input()
    get template(): Template {
        return this._template;
    }
    set template(template: Template) {
        if (!template) {
            return;
        }
        this._template = template;
        this.generateComponents();
        this.setMessage();
    }
    private _template!: Template;
    @ViewChild("templateMessage")
    templateMessage!: MessageTemplateContentComponent;
    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    isModalOpen = false;
    mediaByUrl = false;
    selectedFile?: File;
    headerMediaByUrl = false;
    headerUseMedia: {
        caption: string;
        id: string;
        link: string;
    } = {
        caption: "",
        id: "",
        link: "",
    };
    components: UseTemplateComponent[] = [];
    message?: Conversation;
    bodyText: { text: string; type: ParameterType } = {
        text: "",
        type: ParameterType.text,
    };

    adjustHeight(area: HTMLTextAreaElement): void {
        if (!area) return;
        area.style.height = "auto"; // Reset height to auto to get the correct scrollHeight
        area.style.height = `${area.scrollHeight}px`; // Set height to scrollHeight
    }

    async onFileSelected(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.files || target.files.length <= 0) return (this.selectedFile = undefined);

        this.selectedFile = target.files[0];
        const mimeType = this.selectedFile.type;
        try {
            const uploadResponse = await this.mediaController.uploadMedia(
                this.selectedFile,
                mimeType,
            );
            this.headerUseMedia.id = uploadResponse.id;
        } catch (error) {
            this.handleErr("Failed to upload media", error);
            return Promise.reject(error);
        }
    }

    generateComponents() {
        this.components = this.template.components
            .flatMap(component => {
                // For BUTTONS components, create separate entries for each button with variables
                if (
                    component.type.toLowerCase() === TemplateComponentType.buttons.toLowerCase() &&
                    component.buttons
                ) {
                    return component.buttons
                        .map((button, buttonIndex) => {
                            if (button.url && this.extractVariables(button.url).length > 0) {
                                return this.generateComponent(component, buttonIndex);
                            }
                            return null;
                        })
                        .filter(
                            (comp): comp is UseTemplateComponent =>
                                comp !== null && comp.parameters.length > 0,
                        );
                }

                // For other components, generate normally
                return this.generateComponent(component);
            })
            .filter(generatedComponent => generatedComponent.parameters.length !== 0);
    }

    generateComponent(component: TemplateComponent, buttonIndex?: number): UseTemplateComponent {
        // Convert TemplateComponentType to UseTemplateComponentType (handles BUTTONS -> BUTTON)
        const useComponentType = this.typeConverter.transform(component.type);

        const useComponent: UseTemplateComponent = {
            type: useComponentType,
            parameters: [],
        };

        // For BUTTONS component, example data is on individual buttons, not on the component
        const isButtonComponent =
            component.type.toLowerCase() === TemplateComponentType.buttons.toLowerCase();

        if (!component.example && !isButtonComponent) return useComponent;

        if (isButtonComponent && buttonIndex !== undefined) {
            useComponent.sub_type = ButtonSubtype.url;
            useComponent.index = String(buttonIndex);
        }

        const example = component.example || {};

        switch (component.type.toLowerCase()) {
            case TemplateComponentType.header.toLowerCase():
                this.handleHeaderComponent(component, useComponent, example);
                break;
            case TemplateComponentType.body.toLowerCase():
                this.handleBodyComponent(component, useComponent, example);
                break;
            case TemplateComponentType.footer.toLowerCase():
                this.handleFooterComponent(component, useComponent);
                break;
            case TemplateComponentType.buttons.toLowerCase():
                this.handleButtonsComponent(component, useComponent, example, buttonIndex);
                break;
        }

        return useComponent;
    }

    handleHeaderComponent(
        component: TemplateComponent,
        useComponent: UseTemplateComponent,
        example: ComponentExample,
    ) {
        if (
            component.format?.toLowerCase() != TemplateComponentFormat.Text.toLowerCase() &&
            example.header_handle?.length
        ) {
            useComponent.parameters.push({
                type: component.format?.toLowerCase() as ParameterType,
                [component.format?.toLowerCase() as ParameterType]: this.headerUseMedia,
            });
        } else if (example.header_text && example.header_text.length > 0) {
            example.header_text.forEach(() => {
                useComponent.parameters.push({
                    type: ParameterType.text,
                    text: "",
                    // placeholder: exampleValue || undefined,
                });
            });
        } else if (
            component.format?.toLowerCase() === TemplateComponentFormat.Text.toLowerCase() &&
            component.text
        ) {
            // If no example data, extract variables directly from the header text
            const variables = this.extractVariables(component.text);
            variables.forEach(() => {
                useComponent.parameters.push({
                    type: ParameterType.text,
                    text: "",
                    // placeholder: `Enter ${variableName}`,
                });
            });
        }
    }

    handleBodyComponent(
        component: TemplateComponent,
        useComponent: UseTemplateComponent,
        example: ComponentExample,
    ) {
        // First, try to use example.body_text if it exists
        if (example.body_text && example.body_text.length > 0) {
            example.body_text.forEach(() => {
                // const exampleValue = Array.isArray(exampleGroup) ? exampleGroup[0] : exampleGroup;
                useComponent.parameters.push({
                    type: ParameterType.text,
                    text: "",
                    // placeholder: exampleValue || undefined,
                });
            });
            return;
        }

        // If no example data, extract variables directly from the component text
        if (component.text) {
            const variables = this.extractVariables(component.text);
            variables.forEach(() => {
                useComponent.parameters.push({
                    type: ParameterType.text,
                    text: "",
                    // placeholder: `Enter ${variableName}`,
                });
            });
        }
    }

    /**
     * Extracts all variables from a text string, supporting both {{number}} and {{name}} formats
     * @param text The text to extract variables from
     * @returns Array of variable names/numbers found in the text
     */
    extractVariables(text: string): string[] {
        const variableRegex = /\{\{([^}]+)\}\}/g;
        const variables: string[] = [];
        let match;

        while ((match = variableRegex.exec(text)) !== null) {
            variables.push(match[1].trim());
        }

        return variables;
    }

    handleFooterComponent(component: TemplateComponent, useComponent: UseTemplateComponent) {
        if (!component.text) return;
        const variables = this.extractVariables(component.text);
        if (!variables.length) {
            useComponent.parameters.push({
                type: ParameterType.text,
                text: "",
                // placeholder: component.text,
            });
            return;
        }

        variables.forEach(() => {
            useComponent.parameters.push({
                type: ParameterType.text,
                text: "",
                // placeholder: `Enter ${variableName}`,
            });
        });
    }

    handleButtonsComponent(
        component: TemplateComponent,
        useComponent: UseTemplateComponent,
        example: ComponentExample,
        buttonIndex?: number,
    ) {
        // Check if any button has variables in their URLs
        if (!component.buttons) return;

        // If buttonIndex is provided, only process that specific button
        if (buttonIndex !== undefined) {
            const button = component.buttons[buttonIndex];
            if (button && button.url) {
                // Extract variables from the URL template
                const variables = this.extractVariables(button.url);
                // const exampleValues = this.extractButtonExampleValues(button.url, button.example);

                variables.forEach(() => {
                    // const placeholder = exampleValues[index] || `Enter ${variableName}`;
                    useComponent.parameters.push({
                        type: ParameterType.text,
                        text: "",
                        // placeholder,
                    });
                });
            }
            return;
        }

        // Otherwise, process all buttons (fallback for backwards compatibility)
        component.buttons.forEach(button => {
            if (button.url) {
                // Extract variables from the URL template
                const variables = this.extractVariables(button.url);
                // const exampleValues = this.extractButtonExampleValues(button.url, button.example);

                variables.forEach(() => {
                    // const placeholder = exampleValues[index] || `Enter ${variableName}`;
                    useComponent.parameters.push({
                        type: ParameterType.text,
                        text: "",
                        // placeholder,
                    });
                });
            }
        });
    }

    /**
     * Extracts example values for button URL variables
     * @param templateUrl The template URL with variables (e.g., "https://example.com?id={{1}}")
     * @param example The example data from the button (can be string, array, or undefined)
     * @returns Array of example values for each variable
     */
    extractButtonExampleValues(templateUrl: string, example?: string | string[]): string[] {
        if (!example) return [];

        const exampleArray = Array.isArray(example) ? example : [example];
        const variables = this.extractVariables(templateUrl);
        const exampleValues: string[] = [];

        // If example is a full URL, try to extract variable values from it
        if (exampleArray.length > 0 && exampleArray[0].startsWith("http")) {
            const exampleUrl = exampleArray[0];

            // Create a regex pattern from the template URL
            // Replace {{variable}} with a capture group
            let pattern = templateUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape special chars
            variables.forEach(() => {
                pattern = pattern.replace(/\\\{\\\{[^}]+\\\}\\\}/, "(.+?)"); // Replace first variable with capture group
            });

            const regex = new RegExp(pattern);
            const match = exampleUrl.match(regex);

            if (match) {
                // Extract captured groups (skip the first element which is the full match)
                for (let i = 1; i < match.length; i++) {
                    exampleValues.push(match[i]);
                }
            }
        } else {
            // Example contains direct values
            return exampleArray;
        }

        return exampleValues;
    }

    setMessage() {
        if (!this.template || !this.template.name || !this.template.language) return;
        const message = {
            from_id: NilUUID,
            messaging_product_id: NilUUID,
            to_id: NilUUID,
            id: NilUUID,
            sender_data: {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: "0000000000",
                type: MessageType.template,
                template: {
                    name: this.template.name,
                    language: { code: this.template.language },
                    components: this.components,
                },
            },
            created_at: new Date(),
            updated_at: new Date(),
        };
        this.message = message;
    }

    addParameterToText(event: string, i: number, j: number) {
        this.components[i].parameters[j].text = event;
        this.templateMessage.interpolateTemplate();
    }

    onMediaModeChange(event: string) {
        this.mediaByUrl = event === "true";
    }

    copySenderData() {
        navigator.clipboard.writeText(JSON.stringify(this.message?.sender_data, null, 4));
    }

    // Helper function to flatten nested objects, handling arrays as JSON strings
    flattenObject(
        obj: object,
        parentKey = "",
        result: Record<string, unknown> = {},
    ): Record<string, unknown> {
        const record = obj as Record<string, unknown>;
        for (const key in record) {
            if (Object.prototype.hasOwnProperty.call(record, key)) {
                const newKey = parentKey ? `${parentKey}.${key}` : key;
                const value = record[key];

                if (value && typeof value === "object" && !Array.isArray(value)) {
                    // Recursively flatten nested objects
                    this.flattenObject(value as Record<string, unknown>, newKey, result);
                } else if (Array.isArray(value)) {
                    // Serialize arrays as JSON strings
                    result[newKey] = JSON.stringify(value);
                } else {
                    // Assign primitive values directly
                    result[newKey] = value;
                }
            }
        }
        return result;
    }

    downloadCsvData(): void {
        // Validate that sender_data exists and is an array
        if (!this.message?.sender_data) {
            this.logger.error("sender_data is not available.");
            return;
        }

        // Flatten each object in sender_data
        const flattenedData = [this.message.sender_data].map(item => this.flattenObject(item));

        // Convert flattened data to CSV using PapaParse
        const csv = Papa.unparse(flattenedData);

        // Create a Blob from the CSV string
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

        // Use FileSaver.js to save the file
        saveAs(blob, "template-messages.csv");
    }

    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    async sendToContacts(contacts: ConversationMessagingProductContact[]) {
        let senderData = this.message?.sender_data;
        if (!senderData) throw new Error("No sender data found");
        senderData = {
            ...senderData,
            messaging_product: "whatsapp",
            type: MessageType.template,
            recipient_type: "individual",
        };
        const sendPromises = contacts.map(contact => {
            const to_id = contact.id;
            const sender_data = {
                ...senderData,
                to: contact.product_details.phone_number,
            };
            const promise = this.messageController
                .sendWhatsAppMessage({
                    to_id,
                    sender_data,
                })
                .catch(err => this.handleErr(`Failed to send message to ${contact.id}`, err));
            this.userConversationStore.addUnsent(sender_data, to_id);
            return promise;
        });
        await Promise.all(sendPromises);
    }

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
