# Add Billing Redirect

Add billing-aware redirect handling to an HTTP surface that already uses
`MainServerControllerService`.

Use this when the backend returns a `429` response with
`{ context: "billing" }` and the client should redirect the user to the billing
page.

Inputs:

- target controller or shared HTTP base class
- current billing route and billing page component
- any existing redirect or navigation guards

Workflow:

1. Confirm the request path already flows through `MainServerControllerService`.
2. Add or reuse a redirect-in-progress flag to prevent loops.
3. Redirect only when:
    - the response status is `429`
    - the response context is `billing`
    - the user is not already under `/billing` or `/auth`
4. Reset the redirect guard on `NavigationEnd`.
5. Verify `RoutePath.billing` and the billing page route exist.

Done criteria:

- quota responses redirect to billing exactly once per navigation cycle
- auth pages and billing pages do not loop
- the change stays in shared infrastructure unless a narrower scope is required
