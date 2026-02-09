import { Component, inject, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PhoneConfig } from "../../../core/phone-config/entity/phone-config.entity";
import { PhoneConfigControllerService } from "../../../core/phone-config/controller/phone-config-controller.service";
import { WorkspaceStoreService } from "../../../core/workspace/store/workspace-store.service";
import { WhatsAppError } from "../../../core/common/model/whatsapp-error.model";

@Component({
    selector: "app-phone-config-registration",
    imports: [CommonModule, FormsModule],
    templateUrl: "./phone-config-registration.component.html",
    standalone: true,
})
export class PhoneConfigRegistrationComponent {
    @Input({ required: true }) config!: PhoneConfig;

    private phoneConfigController = inject(PhoneConfigControllerService);
    private workspaceStore = inject(WorkspaceStoreService);

    expanded = false;
    successMessage = "";
    errorMessage = "";
    whatsappError: WhatsAppError | null = null;

    // Request Code
    codeMethod = "SMS";
    language = "en";
    languageOptions = [
        { value: "af", label: "Afrikaans" },
        { value: "sq", label: "Albanian" },
        { value: "ar", label: "Arabic" },
        { value: "ar_EG", label: "Arabic (EGY)" },
        { value: "ar_AE", label: "Arabic (United Arab Emirates)" },
        { value: "ar_LB", label: "Arabic (LBN)" },
        { value: "ar_MA", label: "Arabic (MAR)" },
        { value: "ar_QA", label: "Arabic (QAT)" },
        { value: "az", label: "Azerbaijani" },
        { value: "be_BY", label: "Belarusian" },
        { value: "bn", label: "Bengali" },
        { value: "bn_IN", label: "Bengali (IND)" },
        { value: "bg", label: "Bulgarian" },
        { value: "ca", label: "Catalan" },
        { value: "zh_CN", label: "Chinese (CHN)" },
        { value: "zh_HK", label: "Chinese (HKG)" },
        { value: "zh_TW", label: "Chinese (TAI)" },
        { value: "hr", label: "Croatian" },
        { value: "cs", label: "Czech" },
        { value: "da", label: "Danish" },
        { value: "prs_AF", label: "Dari" },
        { value: "nl", label: "Dutch" },
        { value: "nl_BE", label: "Dutch (BEL)" },
        { value: "en", label: "English" },
        { value: "en_GB", label: "English (United Kingdom)" },
        { value: "en_US", label: "English (USA)" },
        { value: "en_AE", label: "English (United Arab Emirates)" },
        { value: "en_AU", label: "English (AUS)" },
        { value: "en_CA", label: "English (CAN)" },
        { value: "en_GH", label: "English (GHA)" },
        { value: "en_IE", label: "English (IRL)" },
        { value: "en_IN", label: "English (India)" },
        { value: "en_JM", label: "English (JAM)" },
        { value: "en_MY", label: "English (MYS)" },
        { value: "en_NZ", label: "English (NZL)" },
        { value: "en_QA", label: "English (QAT)" },
        { value: "en_SG", label: "English (SGP)" },
        { value: "en_UG", label: "English (UGA)" },
        { value: "en_ZA", label: "English (ZAF)" },
        { value: "et", label: "Estonian" },
        { value: "fil", label: "Filipino" },
        { value: "fi", label: "Finnish" },
        { value: "fr", label: "French" },
        { value: "fr_BE", label: "French (BEL)" },
        { value: "fr_CA", label: "French (CAN)" },
        { value: "fr_CH", label: "French (CHE)" },
        { value: "fr_CI", label: "French (CIV)" },
        { value: "fr_MA", label: "French (MAR)" },
        { value: "ka", label: "Georgian" },
        { value: "de", label: "German" },
        { value: "de_AT", label: "German (AUT)" },
        { value: "de_CH", label: "German (CHE)" },
        { value: "el", label: "Greek" },
        { value: "gu", label: "Gujarati" },
        { value: "ha", label: "Hausa" },
        { value: "he", label: "Hebrew" },
        { value: "hi", label: "Hindi" },
        { value: "hu", label: "Hungarian" },
        { value: "id", label: "Indonesian" },
        { value: "ga", label: "Irish" },
        { value: "it", label: "Italian" },
        { value: "ja", label: "Japanese" },
        { value: "kn", label: "Kannada" },
        { value: "kk", label: "Kazakh" },
        { value: "rw_RW", label: "Kinyarwanda" },
        { value: "ko", label: "Korean" },
        { value: "ky_KG", label: "Kyrgyz (Kyrgyzstan)" },
        { value: "lo", label: "Lao" },
        { value: "lv", label: "Latvian" },
        { value: "lt", label: "Lithuanian" },
        { value: "mk", label: "Macedonian" },
        { value: "ms", label: "Malay" },
        { value: "ml", label: "Malayalam" },
        { value: "mr", label: "Marathi" },
        { value: "nb", label: "Norwegian" },
        { value: "ps_AF", label: "Pashto" },
        { value: "fa", label: "Persian" },
        { value: "pl", label: "Polish" },
        { value: "pt_BR", label: "Portuguese (BR)" },
        { value: "pt_PT", label: "Portuguese (POR)" },
        { value: "pa", label: "Punjabi" },
        { value: "ro", label: "Romanian" },
        { value: "ru", label: "Russian" },
        { value: "sr", label: "Serbian" },
        { value: "si_LK", label: "Sinhala" },
        { value: "sk", label: "Slovak" },
        { value: "sl", label: "Slovenian" },
        { value: "es", label: "Spanish" },
        { value: "es_AR", label: "Spanish (ARG)" },
        { value: "es_CL", label: "Spanish (CHL)" },
        { value: "es_CO", label: "Spanish (COL)" },
        { value: "es_CR", label: "Spanish (CRI)" },
        { value: "es_DO", label: "Spanish (DOM)" },
        { value: "es_EC", label: "Spanish (ECU)" },
        { value: "es_HN", label: "Spanish (Honduras)" },
        { value: "es_MX", label: "Spanish (MEX)" },
        { value: "es_PA", label: "Spanish (PAN)" },
        { value: "es_PE", label: "Spanish (PER)" },
        { value: "es_ES", label: "Spanish (SPA)" },
        { value: "es_UY", label: "Spanish (URY)" },
        { value: "sw", label: "Swahili" },
        { value: "sv", label: "Swedish" },
        { value: "ta", label: "Tamil" },
        { value: "te", label: "Telugu" },
        { value: "th", label: "Thai" },
        { value: "tr", label: "Turkish" },
        { value: "uk", label: "Ukrainian" },
        { value: "ur", label: "Urdu" },
        { value: "uz", label: "Uzbek" },
        { value: "vi", label: "Vietnamese" },
        { value: "zu", label: "Zulu" },
    ];

    // Verify Code
    verifyCode = "";

    // PIN Authenticate
    pinAuth = "";
    showPinAuth = false;

    // Register
    registerExpanded = false;
    registerPin = "";
    showRegisterPin = false;
    dataLocalizationRegion = "";

    regionOptions = [
        { value: "", label: "None" },
        { value: "AU", label: "Australia (AU)" },
        { value: "ID", label: "Indonesia (ID)" },
        { value: "IN", label: "India (IN)" },
        { value: "JP", label: "Japan (JP)" },
        { value: "SG", label: "Singapore (SG)" },
        { value: "KR", label: "South Korea (KR)" },
        { value: "DE", label: "Germany (DE)" },
        { value: "CH", label: "Switzerland (CH)" },
        { value: "GB", label: "United Kingdom (GB)" },
        { value: "BR", label: "Brazil (BR)" },
        { value: "BH", label: "Bahrain (BH)" },
        { value: "ZA", label: "South Africa (ZA)" },
        { value: "AE", label: "United Arab Emirates (AE)" },
        { value: "CA", label: "Canada (CA)" },
    ];

    loading = false;

    toggle(): void {
        this.expanded = !this.expanded;
    }

    toggleRegister(): void {
        this.registerExpanded = !this.registerExpanded;
    }

    private clearMessages(): void {
        this.successMessage = "";
        this.errorMessage = "";
        this.whatsappError = null;
    }

    private handleError(error: unknown, fallback: string): void {
        const data = (error as any)?.response?.data;
        if (data?.context === "whatsapp" && data?.content?.error) {
            this.whatsappError = data.content.error;
            this.errorMessage = data.message || fallback;
        } else {
            this.whatsappError = null;
            this.errorMessage = fallback;
        }
    }

    async onRequestCode(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        this.clearMessages();
        this.loading = true;
        try {
            await this.phoneConfigController.requestCode(ws.id, this.config.id, {
                code_method: this.codeMethod,
                language: this.language,
            });
            this.successMessage = "Verification code requested successfully.";
        } catch (error) {
            this.handleError(error, "Failed to request verification code.");
        } finally {
            this.loading = false;
        }
    }

    async onVerifyCode(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        this.clearMessages();
        this.loading = true;
        try {
            await this.phoneConfigController.verifyCode(ws.id, this.config.id, {
                code: this.verifyCode,
            });
            this.successMessage = "Code verified successfully.";
            this.verifyCode = "";
        } catch (error) {
            this.handleError(error, "Failed to verify code.");
        } finally {
            this.loading = false;
        }
    }

    async onPinAuthenticate(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        this.clearMessages();
        this.loading = true;
        try {
            await this.phoneConfigController.pinAuthenticate(ws.id, this.config.id, {
                pin: this.pinAuth,
            });
            this.successMessage = "PIN authenticated successfully.";
            this.pinAuth = "";
            this.registerExpanded = true;
        } catch (error) {
            this.handleError(error, "Failed to authenticate PIN.");
        } finally {
            this.loading = false;
        }
    }

    async onRegister(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        this.clearMessages();
        this.loading = true;
        try {
            const data: { pin: string; data_localization_region?: string } = {
                pin: this.registerPin,
            };
            if (this.dataLocalizationRegion) {
                data.data_localization_region = this.dataLocalizationRegion;
            }
            await this.phoneConfigController.register(ws.id, this.config.id, data);
            this.successMessage = "Phone registered successfully.";
            this.registerPin = "";
            this.dataLocalizationRegion = "";
        } catch (error) {
            this.handleError(error, "Failed to register phone.");
        } finally {
            this.loading = false;
        }
    }

    async onDeregister(): Promise<void> {
        const ws = this.workspaceStore.currentWorkspace;
        if (!ws) return;
        if (!confirm("Are you sure you want to deregister this phone number?")) return;
        this.clearMessages();
        this.loading = true;
        try {
            await this.phoneConfigController.deregister(ws.id, this.config.id);
            this.successMessage = "Phone deregistered successfully.";
        } catch (error) {
            this.handleError(error, "Failed to deregister phone.");
        } finally {
            this.loading = false;
        }
    }
}
