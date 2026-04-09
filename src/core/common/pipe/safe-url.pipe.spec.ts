import { TestBed } from "@angular/core/testing";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { SafeUrlPipe } from "./safe-url.pipe";
import { environment } from "../../../environments/environment";

describe("SafeUrlPipe", () => {
    let pipe: SafeUrlPipe;
    let sanitizer: jasmine.SpyObj<DomSanitizer>;

    beforeEach(() => {
        const sanitizerSpy = jasmine.createSpyObj("DomSanitizer", [
            "bypassSecurityTrustResourceUrl",
        ]);
        TestBed.configureTestingModule({
            providers: [SafeUrlPipe, { provide: DomSanitizer, useValue: sanitizerSpy }],
        });
        pipe = TestBed.inject(SafeUrlPipe);
        sanitizer = TestBed.inject(DomSanitizer) as jasmine.SpyObj<DomSanitizer>;

        // Set up environment for testing
        environment.mainServerUrl = "trusted.com";
        environment.automationServerUrl = "automation.io";
    });

    it("create an instance", () => {
        expect(pipe).toBeTruthy();
    });

    it("should allow blob URLs", () => {
        const blobUrl = "blob:http://localhost:4200/123-456";
        sanitizer.bypassSecurityTrustResourceUrl.and.returnValue(blobUrl as SafeResourceUrl);

        const result = pipe.transform(blobUrl);

        expect(result).toBe(blobUrl as SafeResourceUrl);
        expect(sanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith(blobUrl);
    });

    it("should allow URLs from mainServerUrl", () => {
        const trustedUrl = "https://trusted.com/api/data";
        sanitizer.bypassSecurityTrustResourceUrl.and.returnValue(
            trustedUrl as SafeResourceUrl,
        );

        const result = pipe.transform(trustedUrl);

        expect(result).toBe(trustedUrl as SafeResourceUrl);
        expect(sanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith(trustedUrl);
    });

    it("should allow URLs from automationServerUrl", () => {
        const trustedUrl = "https://automation.io/dashboard";
        sanitizer.bypassSecurityTrustResourceUrl.and.returnValue(
            trustedUrl as SafeResourceUrl,
        );

        const result = pipe.transform(trustedUrl);

        expect(result).toBe(trustedUrl as SafeResourceUrl);
        expect(sanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith(trustedUrl);
    });

    it("should block untrusted URLs", () => {
        const untrustedUrl = "https://malicious.com/attack";
        spyOn(console, "warn");

        const result = pipe.transform(untrustedUrl);

        expect(result).toBe("");
        expect(sanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
    });

    it("should block javascript: URLs", () => {
        const dangerousUrl = "javascript:alert('xss')";
        spyOn(console, "warn");

        const result = pipe.transform(dangerousUrl);

        expect(result).toBe("");
        expect(sanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
    });

    it("should handle empty or null input", () => {
        expect(pipe.transform("")).toBe("");
        expect(pipe.transform(null as unknown as string)).toBe("");
    });
});
