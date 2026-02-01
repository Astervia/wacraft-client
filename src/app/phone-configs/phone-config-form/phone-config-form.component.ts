import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PhoneConfig } from "../../../core/phone-config/entity/phone-config.entity";
import {
    CreatePhoneConfig,
    UpdatePhoneConfig,
} from "../../../core/phone-config/model/create.model";

@Component({
    selector: "app-phone-config-form",
    imports: [CommonModule, FormsModule],
    templateUrl: "./phone-config-form.component.html",
    standalone: true,
})
export class PhoneConfigFormComponent implements OnInit {
    @Input() editingConfig: PhoneConfig | null = null;
    @Output() save = new EventEmitter<CreatePhoneConfig | UpdatePhoneConfig>();
    @Output() cancel = new EventEmitter<void>();

    showAppSecret = false;
    showAccessToken = false;

    formData: CreatePhoneConfig = {
        name: "",
        waba_id: "",
        waba_account_id: "",
        display_phone: "",
        meta_app_secret: "",
        access_token: "",
        webhook_verify_token: "",
        is_active: true,
    };

    ngOnInit(): void {
        if (this.editingConfig) {
            this.formData = {
                name: this.editingConfig.name,
                waba_id: this.editingConfig.waba_id,
                waba_account_id: this.editingConfig.waba_account_id,
                display_phone: this.editingConfig.display_phone,
                meta_app_secret: this.editingConfig.meta_app_secret || "",
                access_token: this.editingConfig.access_token || "",
                webhook_verify_token: this.editingConfig.webhook_verify_token || "",
                is_active: this.editingConfig.is_active,
            };
        }
    }

    onSubmit(): void {
        if (this.editingConfig) {
            const update: UpdatePhoneConfig = {
                name: this.formData.name,
                waba_id: this.formData.waba_id,
                waba_account_id: this.formData.waba_account_id,
                display_phone: this.formData.display_phone,
                is_active: this.formData.is_active,
            };
            if (this.formData.meta_app_secret)
                update.meta_app_secret = this.formData.meta_app_secret;
            if (this.formData.access_token) update.access_token = this.formData.access_token;
            if (this.formData.webhook_verify_token)
                update.webhook_verify_token = this.formData.webhook_verify_token;
            this.save.emit(update);
        } else {
            this.save.emit(this.formData);
        }
    }

    onCancel(): void {
        this.cancel.emit();
    }
}
