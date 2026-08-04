# Testicon

Software testing portal for inviting selected testers, launching internal apps in iframes, collecting structured bug reports, and paying rewards by severity.

## Features

- **Admin Portal** — Manage test apps, invite testers, review issues, approve payouts
- **Tester Portal** — Accept invitations, sign NDA/terms, describe app understanding, launch apps
- **Iframe Shell** — Back button (left) and Report Issue (right) while testing
- **Date Windows** — Apps only accessible between configured start/end dates
- **Issue Sync** — Issues sync to Internal-App under the linked app record
- **Rewards** — Pay testers by severity (Low/Medium/High/Critical), withdraw approved balances

## Quick Start

```bash
./start.sh
```

Or manually:

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (recommended)

**Live:** [https://testicon-zeta.vercel.app](https://testicon-zeta.vercel.app)

Vercel cannot persist local SQLite or disk uploads. Production uses **Turso** (database) and **Vercel Blob** (icons & screenshots). Local dev still uses `file:./dev.db` and `public/uploads/`.

#### Finish database setup (one-time)

Turso requires accepting Vercel marketplace terms in a browser (cannot be automated):

1. Open [Accept Turso terms](https://vercel.com/tomalvin926-3808s-projects/~/integrations/accept-terms/tursocloud?source=cli) while logged into Vercel
2. Run from the project root:

```bash
npm run deploy:vercel
```

This provisions the Turso database, pushes the schema, seeds admin data, and redeploys.

Or manually:

```bash
vercel integration add tursocloud/database --name testicon-db --plan starter -m region=iad1 -e production -e preview
vercel env pull .env.production.local --environment=production --yes
source .env.production.local
DATABASE_URL="$TURSO_DATABASE_URL" npm run db:setup
curl -X POST https://testicon-zeta.vercel.app/api/setup -H "x-setup-secret: YOUR_SETUP_SECRET"
vercel deploy --prod --yes
```

#### Initial Vercel setup (already done)

1. Project linked: `tomalvin926-3808s-projects/testicon`
2. Blob store: `testicon-blob` (public)
3. Env vars set: `JWT_SECRET`, `ADMIN_EMAILS`, `EMAILJS_*`, `APP_URL`, `BLOB_READ_WRITE_TOKEN`, `SETUP_SECRET`
4. GitHub repo: [github.com/kakaiking/Testicon](https://github.com/kakaiking/Testicon)

Sign in at `/admin/login` with `kakaiphil@gmail.com` after database setup completes.

#### Local Turso alternative

```bash
# Install Turso CLI: https://docs.turso.tech/cli
turso db create testicon
turso db show testicon --url
turso db tokens create testicon
```

Push schema and seed (run once from your machine):

```bash
export TURSO_DATABASE_URL="libsql://..."
export TURSO_AUTH_TOKEN="..."
export DATABASE_URL="$TURSO_DATABASE_URL"
npm run db:setup
```

CI runs on every push via `.github/workflows/ci.yml`.

### Render (alternative)

For a single-platform deploy with local SQLite on a persistent disk, use `render.yaml` — see [Render Blueprint](https://dashboard.render.com/select-repo).

### Default Admin

Sign in at `/admin/login` with the email in `ADMIN_EMAILS` (default: `admin@hackstreetboys.com`).

## Workflow

1. **Admin** creates a test app with launch URL, NDA/terms, date window, and reward amounts
2. **Admin** invites testers by email (invitation link sent via EmailJS, or logged to console if unset)
3. **Tester** accepts invite → signs NDA → accepts terms → describes understanding
4. **Tester** launches app in iframe shell, reports issues with severity
5. **Admin** approves issues → rewards credited → synced to Internal-App issue tab
6. **Tester** withdraws approved reward balance

## Embedded App Protocol

Any app can run inside Testicon's iframe shell — no special casing per app. Integration is **opt-in** via a small SDK and a standard postMessage contract.

### How it works

1. Testicon opens your app's **real** `launchUrl` in an in-app browser shell — like Instagram/X. No reverse proxy, no HTML rewriting, no request middleware after open.
2. After load, the app runs entirely on its own origin (its own JS, APIs, cookies). Testicon only provides chrome (close / report) around it.
3. If a sign-in page is detected, Testicon may offer opening sign-in in a new tab (browsers still restrict third-party cookies inside iframes).
4. If your app includes the embed SDK, it can opt into `testicon:ready` / launch-token identity via postMessage.
5. If the tester logs out inside your app, call `TesticonEmbed.notifyLogout()` — Testicon won't re-send identity until they click **Continue with Testicon**.

Apps that don't include the SDK behave normally with their own login. Screenshots for reports are upload/paste (optional).

### Client SDK

Add to your app:

```html
<script src="https://your-testicon-host/embed-sdk.js"></script>
<script>
  TesticonEmbed.onContext(function (ctx) {
    // ctx.tester — { id, email, name }
    // ctx.token   — verify on your backend (see below)
    // ctx.app     — { id, name }
    signInTester(ctx.tester);
  });

  // Call when user logs out of YOUR app
  function handleLogout() {
    signOut();
    TesticonEmbed.notifyLogout();
  }
</script>
```

### Server verification

Your backend verifies tokens by calling Testicon's public verify endpoint (no shared secret needed on the app side):

```http
POST https://your-testicon-host/api/embed/verify
```

### Message reference

| Direction | Type | Purpose |
|-----------|------|---------|
| App → Testicon | `testicon:ready` | App loaded, ready for context |
| App → Testicon | `testicon:logout` | Tester signed out of the app |
| App → Testicon | `testicon:request-context` | Re-request identity after logout |
| Testicon → App | `testicon:context` | Launch token + tester + app info |

## Internal-App Integration

Set `internalAppId` when creating a test app to the app's ID from Internal-App's Apps registry. Configure Firestore credentials in `.env`:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
```

Issues are pushed to the nested `tickets[]` array on that app record in Firestore `modules/apps` (Internal-App field name).

## EmailJS Setup

Tester invitations are sent through [EmailJS](https://www.emailjs.com/) from the server when an admin clicks **Send Invite**.

### 1. EmailJS account

1. Sign up at [emailjs.com](https://www.emailjs.com/)
2. **Email Services** → Add a service (Gmail, Outlook, etc.) and connect your sending account
3. **Account → Security** → enable **Allow API requests from non-browser applications** (required for server-side sends)
4. **Account → API Keys** → copy your **Public Key** and **Private Key**

### 2. Create the invitation template

**Email Templates** → Create template. Use these settings:

| Field | Value |
|-------|-------|
| **To Email** | `{{to_email}}` |
| **From Name** | `Testicon` |
| **Reply To** | `{{reply_to}}` |
| **Subject** | `{{subject}}` |

**Content** (paste into the template body):

```html
<div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #111827;">
  <h1 style="color: #6366f1; margin-bottom: 16px;">You're invited to test on Testicon</h1>
  <p>You've been granted access to test and report issues for <strong>{{app_name}}</strong>.</p>
  <p>Testicon is a testing portal where you can launch the app, explore it, and submit structured bug reports with severity levels. Approved reports may earn rewards.</p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 24px 0;">
        <a href="{{invite_url}}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Accept invitation &amp; start testing
        </a>
      </td>
    </tr>
  </table>
  <p style="color: #6b7280; font-size: 14px; text-align: center;">
    Invited by {{inviter_email}}<br>{{expires_text}}
  </p>
</div>
```

Copy the **Service ID** and **Template ID** from the EmailJS dashboard.

**Important:** Set the template **Reply To** field to `{{reply_to}}` (not `{{inviter_email}}`). When an admin invites their own email for testing, reply-to is omitted so Gmail does not silently drop the message.

### 3. Environment variables

Add to your `.env` (see `.env.example`):

```
EMAILJS_SERVICE_ID=service_xxxxx
EMAILJS_TEMPLATE_ID=template_xxxxx
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
APP_URL=http://localhost:3000
```

Restart the dev server after updating `.env`.

If EmailJS vars are missing, invitations are still saved but the invite link is only printed in the server console.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite path for local dev (default: `file:./dev.db`) |
| `TURSO_DATABASE_URL` | Turso libSQL URL (Vercel production) |
| `TURSO_AUTH_TOKEN` | Turso auth token (Vercel production) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (auto-set when Blob store is linked) |
| `JWT_SECRET` | Session signing secret |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `EMAILJS_*` | EmailJS service/template/keys for invitation emails |
| `APP_URL` | Public URL for invite links |
| `FIREBASE_*` | Firestore sync to Internal-App |

## Tech Stack

- Next.js 16 (App Router)
- Prisma + SQLite
- Tailwind CSS 4
- JWT session cookies
- EmailJS (tester invitations)
