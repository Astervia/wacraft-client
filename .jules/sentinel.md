## 2024-04-09 - Prevent XSS in Media Display using DomSanitizer

**Vulnerability:** Found `this.sanitizer.bypassSecurityTrustUrl(url)` being used directly with potentially untrusted URLs derived from `mediaData.link` in `MediaPreviewComponent` and `MessageMediaContentComponent`.
**Learning:** Bypassing security implicitly trusts any input URL, which could lead to an XSS vulnerability if an attacker crafts a malicious link. Even though Angular's sanitizer is meant to secure inputs, bypassing it defeats this protection mechanism.
**Prevention:** Always validate external URLs against a set of trusted, pre-approved hostnames (like `environment.mainServerUrl`) before calling `bypassSecurityTrustUrl` or `bypassSecurityTrustResourceUrl`. A centralized utility function (`isTrustedUrl`) has been created to maintain consistent URL validation logic across the application.
