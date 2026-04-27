## 2024-04-11 - Misuse of Angular's bypassSecurityTrustUrl for Sanitization

**Vulnerability:** Found multiple instances where user-provided URLs for media (images, documents, videos) were passed directly to `this.sanitizer.bypassSecurityTrustUrl(url)`. Developers commented "Sanitize the URL" next to this call.
**Learning:** `bypassSecurityTrustUrl` does not sanitize the input; it explicitly tells Angular to trust the value and bypass all built-in sanitization. This is a critical security vulnerability leading to XSS if an attacker provides a malicious URL like `javascript:alert(1)`. There is a clear misunderstanding among developers regarding the difference between `sanitizer.sanitize` and `sanitizer.bypassSecurityTrust*`.
**Prevention:** Always use `this.sanitizer.sanitize(SecurityContext.URL, url)` (or the integer 4 for URL context) when dealing with user-supplied URLs that need to be bound in the template. `bypassSecurityTrust*` should only be used for completely trusted, internal values, or when rigorous custom validation is applied before bypassing.

## 2026-04-12 - Fixing Misuse of Angular's bypassSecurityTrustUrl

**Vulnerability:** Found bypassSecurityTrustUrl used on dynamically generated object URLs instead of proper sanitization.
**Learning:** Generating object URLs from unknown/untrusted Blobs and wrapping them in bypassSecurityTrustUrl can expose applications to XSS attacks since Angular will not sanitize them. Returning them simply as strings sanitized by DomSanitizer.sanitize is cleaner and safer.
**Prevention:** Avoid bypassSecurityTrustUrl unless there's a verified need and strict custom validation. Use sanitize(SecurityContext.URL, url) and return strings for safe template bindings.

## 2026-04-15 - Missing rel="noopener noreferrer" on External Links

**Vulnerability:** Found multiple instances where `target="_blank"` was used on `<a>` tags for external links without `rel="noopener noreferrer"`.
**Learning:** Developers often forget to include `rel="noopener noreferrer"` when opening external links in a new tab. This can expose the application to reverse tabnabbing vulnerabilities, where the newly opened page can access the `window.opener` object of the original page and potentially redirect it to a malicious site.
**Prevention:** Always include `rel="noopener noreferrer"` when using `target="_blank"` on external links, especially when rendering user-supplied URLs or linking to external documentation.

## 2026-04-27 - Missing target="\_blank" and rel="noopener noreferrer" on External Links from User Data

**Vulnerability:** Found an instance in `message-template-content.component.html` where an external, user-supplied URL (`button.url` from a template message) was rendered in an `<a>` tag without `target="_blank"` and `rel="noopener noreferrer"`.
**Learning:** When dealing with dynamic, potentially untrusted URLs in templates (e.g., from WhatsApp template buttons), failing to include `target="_blank"` forces the user to navigate away from the current application tab, which is bad UX and a potential security risk if the URL is malicious. Furthermore, not pairing it with `rel="noopener noreferrer"` exposes the application to reverse tabnabbing.
**Prevention:** Always ensure that external links, especially those populated from user data, open in a new tab securely by explicitly including both `target="_blank"` and `rel="noopener noreferrer"`.
