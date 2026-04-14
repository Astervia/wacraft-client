## 2024-04-11 - Misuse of Angular's bypassSecurityTrustUrl for Sanitization

**Vulnerability:** Found multiple instances where user-provided URLs for media (images, documents, videos) were passed directly to `this.sanitizer.bypassSecurityTrustUrl(url)`. Developers commented "Sanitize the URL" next to this call.
**Learning:** `bypassSecurityTrustUrl` does not sanitize the input; it explicitly tells Angular to trust the value and bypass all built-in sanitization. This is a critical security vulnerability leading to XSS if an attacker provides a malicious URL like `javascript:alert(1)`. There is a clear misunderstanding among developers regarding the difference between `sanitizer.sanitize` and `sanitizer.bypassSecurityTrust*`.
**Prevention:** Always use `this.sanitizer.sanitize(SecurityContext.URL, url)` (or the integer 4 for URL context) when dealing with user-supplied URLs that need to be bound in the template. `bypassSecurityTrust*` should only be used for completely trusted, internal values, or when rigorous custom validation is applied before bypassing.

## 2026-04-12 - Fixing Misuse of Angular's bypassSecurityTrustUrl

**Vulnerability:** Found bypassSecurityTrustUrl used on dynamically generated object URLs instead of proper sanitization.
**Learning:** Generating object URLs from unknown/untrusted Blobs and wrapping them in bypassSecurityTrustUrl can expose applications to XSS attacks since Angular will not sanitize them. Returning them simply as strings sanitized by DomSanitizer.sanitize is cleaner and safer.
**Prevention:** Avoid bypassSecurityTrustUrl unless there's a verified need and strict custom validation. Use sanitize(SecurityContext.URL, url) and return strings for safe template bindings.
