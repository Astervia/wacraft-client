import { Component, EventEmitter, Input, Output, inject } from "@angular/core";
import { Template } from "../../../core/template/model/template.model";
import { CommonModule } from "@angular/common";
import { MessageDataPipe } from "../../../core/message/pipe/message-data.pipe";
import { SenderData } from "../../../core/message/model/sender-data.model";
import { MessageType } from "../../../core/message/model/message-type.model";
import { UseTemplate } from "../../../core/message/model/use-template.model";
import { MessageInfoComponent } from "../message-info/message-info.component";
import { Conversation } from "../../../core/message/model/conversation.model";
import { TemplateButton } from "../../../core/template/model/template-component.model";
import { UseMedia } from "../../../core/message/model/media-data.model";
import { MessageMediaContentComponent } from "../message-media-content/message-media-content.component";
import { MessageForwardedHeaderComponent } from "../message-forwarded-header/message-forwarded-header.component";
import { TemplateInterpolatorService } from "../../../core/template/service/template-interpolator.service";
import { TemplateStoreService } from "../../../core/template/store/template-store.service";
import { MessageReplyHeaderComponent } from "../message-reply-header/message-reply-header.component";

@Component({
    selector: "app-message-template-content",
    imports: [
        CommonModule,
        MessageDataPipe,
        MessageInfoComponent,
        MessageMediaContentComponent,
        MessageForwardedHeaderComponent,
        MessageReplyHeaderComponent,
    ],
    templateUrl: "./message-template-content.component.html",
    styleUrl: "./message-template-content.component.scss",
    preserveWhitespaces: false,
    standalone: true,
})
export class MessageTemplateContentComponent {
    private templateStore = inject(TemplateStoreService);
    private messageDataPipe = inject(MessageDataPipe);
    private templateInterpolator = inject(TemplateInterpolatorService);

    MessageType = MessageType;

    @Output() asyncContentLoaded = new EventEmitter();
    @Input()
    get template(): Template {
        return this._template;
    }
    set template(template: Template) {
        if (!template) {
            return;
        }
        this._template = template;
    }
    private _template!: Template;

    @Input()
    get message(): Conversation {
        return this._message;
    }
    set message(message: Conversation) {
        this._message = message;
        if (!this.template) {
            if (!message.sender_data?.template?.name) return;
            this.loadTemplate(message.sender_data?.template?.name).then(() => {
                this.loadEmptyTemplate();
                this.interpolateTemplate();
                this.asyncContentLoaded.emit();
            });
        } else {
            this.loadEmptyTemplate();
            this.interpolateTemplate();
            this.asyncContentLoaded.emit();
        }
    }
    private _message!: Conversation;

    @Input() sent = true;
    @Input() contactName?: string;

    // Template content built
    headerText = "";
    headerType: MessageType = MessageType.text;
    headerUseMedia: UseMedia = {};
    bodyText = "";
    footerText = "";
    buttons: TemplateButton[] = [];

    async loadTemplate(templateName: string) {
        if (!templateName) return;
        this.template = await this.templateStore.getByName(templateName);
    }

    interpolateTemplate() {
        const data = this.messageDataPipe.transform(this.message) as SenderData;
        const useTemplate = data.template as UseTemplate;

        const interpolated = this.templateInterpolator.interpolateTemplate(
            this.template,
            this.message,
            () => useTemplate,
        );

        this.headerText = interpolated.headerText;
        this.headerType = interpolated.headerType;
        this.headerUseMedia = interpolated.headerUseMedia;
        this.bodyText = interpolated.bodyText;
        this.footerText = interpolated.footerText;
        this.buttons = interpolated.buttons;
    }

    get messageSent() {
        const data = this.messageDataPipe.transform(this.message);
        return data as SenderData;
    }

    copyText(text: string) {
        navigator.clipboard.writeText(text);
    }

    loadEmptyTemplate() {
        this.headerText = "";
        this.headerType = MessageType.text;
        this.headerUseMedia = {};
        this.bodyText = "";
        this.footerText = "";
        this.buttons = [];
    }
}
