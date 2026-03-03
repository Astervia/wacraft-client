# wacraft-client

This is the frontend for the **[wacraft project](https://github.com/Astervia/wacraft)** — a multi-tenant platform for the WhatsApp Cloud API.

With **wacraft**, you can send and receive WhatsApp messages, manage contacts and campaigns, handle webhooks, and automate workflows — all within isolated workspaces with billing and role-based access control.

For backend details, see:

- [wacraft repository](https://github.com/Astervia/wacraft): full-featured platform for supporters.
- [wacraft-lite repository](https://github.com/Astervia/wacraft-lite): optimized for typical use cases and non-supporters.

Both repositories include full API documentation.

This `README.md` focuses on the client (this repo).

## Features

### Multi-Tenant Workspaces

- Create and manage multiple workspaces, each with its own phone configs, contacts, messages, campaigns, and webhooks.
- Invite members by email and assign granular policies (Admin, Member, or Viewer presets, or fully custom).
- Workspace settings: rename, change slug, description, or delete.

### Billing & Subscriptions

- Browse available plans with throughput limits, pricing, and durations.
- Checkout via Stripe (one-time payment or recurring subscription).
- Manage active subscriptions: cancel, reactivate, or sync payment status.
- Real-time usage tracking per user and per workspace, with progress bars and color-coded alerts.
- Dedicated billing admin panel for platform operators.

### Role-Based Access Control

Fine-grained workspace policies covering:

- `workspace.admin` / `workspace.settings` / `workspace.members`
- `phone_config.read` / `phone_config.manage`
- `contact.read` / `contact.manage`
- `message.read` / `message.send`
- `campaign.read` / `campaign.manage` / `campaign.run`
- `webhook.read` / `webhook.manage`
- `billing.read` / `billing.manage` / `billing.admin`

### Messaging & Automation

- Full WhatsApp Cloud API message support (text, media, templates, location, etc.)
- CSV-to-campaign bulk messaging
- Node-RED automation integration (wacraft full version only)
- Real-time chat sidebar with WebSocket updates

### Account Management

- Self-service registration with email verification
- Forgot/reset password flows
- Workspace invitation acceptance
- Personal account settings

## Getting Started

### Environment Variables

Create your `.env` file:

```bash
cp example.env .env
```

Fill in your credentials and other required values. Descriptions for each variable are included in `example.env`.

> **Don't skip variables or remove them unless you're sure.**

### Running with Docker (Recommended for production)

Build the image and run:

```bash
docker build --ssh default -t wacraft-client:latest -f Dockerfile .

docker run -d \
  --name wacraft-client \
  --env-file .env \
  -p 80:80 \
  wacraft-client:latest
```

The application runs behind an Nginx reverse proxy on port 80, which enables i18n features.

### Running with Angular CLI (Recommended for development)

```bash
ng serve
```

You can also use `--configuration=production` or `--configuration=development` for different build profiles.

## Deploy

### Vercel

Create a new Vercel project, link it to this repository, and fill in the environment variables in the Vercel dashboard. The existing `vercel.json` handles the rest.

## i18n

To extract translatable strings:

```bash
ng extract-i18n --output-path src/locale
```
