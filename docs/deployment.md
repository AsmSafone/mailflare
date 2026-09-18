# Deployment and configuration

This guide covers Cloudflare deployment, runtime configuration, database backups, and application updates.

## Overview

Set up Mailflare in three steps:

1. **Deploy the app:** use the Deploy to Cloudflare button, set the app name to `mailflare`, and provide the required `CF_TOKEN`.
2. **Complete setup:** open the deployed app and follow `/setup` to check the installation and create the first admin account.
3. **Connect your domain:** add a domain managed by the same Cloudflare account. Mailflare configures email routing and, when available and selected, email sending before helping you create the first mailbox.

The Worker name must remain `mailflare`. Before starting, create the required `CF_TOKEN` with **Zone Read**, **DNS Edit**, **Email Routing Edit**, and **Email Routing Rules Write** permissions for every domain you plan to connect. DNS Edit lets the confirmed setup flow replace conflicting MX records. Add **Email Sending Edit** when Mailflare should send email; it is optional for receive-only domains.

## Step 1: Deploy mailflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hieunc229/mailflare)

1. Click **Deploy to Cloudflare** above and sign in to Cloudflare if prompted.
2. Choose the Cloudflare account that owns the domain you want to use.
3. Set the app name to exactly `mailflare`. Do not rename it.
4. Add `CF_TOKEN` when Cloudflare asks for the app's runtime variables or secrets.
5. Start the deployment and wait for Cloudflare to finish provisioning and deploying the Worker.

### Required configuration

Mailflare requires this runtime value:

- `CF_TOKEN` — a scoped Cloudflare API token with **Zone Read**, **DNS Edit**, **Email Routing Edit**, and **Email Routing Rules Write** access for the domains you will connect. Add **Email Sending Edit** to enable outbound mail. This is separate from the token Cloudflare uses to deploy the app.

Paste only the token secret into `CF_TOKEN`. Do not include the word `Bearer` and do not use the token ID. The token must belong to the same Cloudflare account as the domains you connect.

## Step 2: Complete mailflare setup

1. Open the URL of the deployed `mailflare` Worker.
2. Go to `/setup` if Mailflare does not take you there automatically.
3. Let Mailflare check the required Cloudflare configuration and initialize the empty D1 database.
4. Create the first admin account when prompted.

Setup applies the committed migrations through the Worker's D1 binding before creating the first admin account.

## Step 3: Connect your primary domain and create an account

1. Enter a domain that already uses Cloudflare DNS on the same account as `CF_TOKEN`.
2. Continue while Mailflare enables Email Routing and configures the required routing and sending DNS.
3. Choose the address for your first mailbox and finish setup.
4. Open the inbox and send a test message to the new address.

To connect more domains later, open **Admin → Domains**, select **New domain**, and enter the hostname. Mailflare configures Email Routing and Email Sending automatically.

Your inbox should be ready to send and receive emails

---

## GitHub Actions deployment (Zero local install)

If you do not want to install Node.js, npm, or Wrangler on your computer, you can run the complete setup and deployment flow through GitHub Actions:

### 1. Configure repository secrets
In your GitHub repository, navigate to **Settings → Secrets and variables → Actions** and add:
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with permissions for:
  - Account: **Workers Scripts:Edit**, **D1:Edit**, **R2 Storage:Edit**, **Queues:Edit**, **Workers Durable Objects:Edit**, **Workers Rate Limiting:Edit**
  - All accounts: **Email Sending:Edit**, **Email Routing Addresses:Edit**
  - All zones: **DNS Settings:Edit**, **Email Routing Rules:Edit**, **Zone Settings:Edit**, **DNS:Edit**, **Zone:Read**
- *(Optional)* `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID. If omitted, the workflow automatically resolves your Account ID from the API token.
- *(Optional)* `CF_TOKEN`: If you want a separate scoped token for the runtime Worker. If omitted, `CLOUDFLARE_API_TOKEN` is automatically used.
- *(Optional)* `TURNSTILE_SECRET_KEY` & `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: If you wish to enable Cloudflare Turnstile captcha on login and onboarding.

### 2. Run the deployment workflow
1. Go to the **Actions** tab in your repository.
2. Select **Deploy to Cloudflare**.
3. Click **Run workflow** (or simply commit and push to `main` / `master`).
4. The workflow will automatically:
   - Check if D1 database `mailflare` exists (and create it if it does not).
   - Inject the allocated `database_id` into the deployment configuration.
   - Idempotently create the R2 bucket `mailflare-raw` and queues (`mailflare-inbound`, `mailflare-outbound`).
   - Build and bundle the application with OpenNext.
   - Deploy the complete Worker with cron triggers, Queues, R2, and Durable Objects.
   - Set the runtime secrets (`CF_TOKEN`, etc.).
   - Apply pending D1 database migrations remotely.
5. In the workflow run summary, locate the deployed **Worker URL** and open `https://<your-worker-url>/setup` to complete the initial admin account setup and domain connection.

---

## Manual deployment

Install dependencies, configure the Cloudflare bindings in `wrangler.jsonc`, and run:

```bash
npm install
npm run deploy:local
```

The local deploy command builds and uploads the complete Worker with Wrangler. It does not modify D1. The complete Worker is required because `worker.ts` also handles inbound email, queues, scheduled backups, and the real-time Durable Object.

For manual recovery, pending migrations can still be applied with:

```bash
npm run db:migrate:remote
```

Remote migrations require the target account's `database_id` in your local `wrangler.jsonc`. Do not commit an account-specific database ID to a reusable repository.

## Database backups

Mailflare exports its D1 records as JSON and stores the backup files in the configured R2 bucket. A cron trigger in `wrangler.jsonc` runs daily at 02:00 UTC and applies the schedule selected under **Admin → Backups**. Manual backups run the same record export directly from the admin API.

Deploy the complete Worker with `npm run deploy` whenever the cron trigger is added or changed.

After upgrading an existing installation and confirming the cron trigger is active, the old Workflow can be removed with `npx wrangler workflows delete mailflare-database-backup`. Deleting it also removes its historical Workflow instances; backup files in R2 and rows in Mailflare's backup history are unaffected.

## Updating Mailflare

The **Update Mailflare** button in the admin dashboard dispatches `.github/workflows/deploy-update.yml` in the installation repository. The workflow merges the latest upstream source and pushes the updated source. A connected Cloudflare Git integration then builds and deploys the change.

Deployment and database migration are separate. After Cloudflare deploys a repository push or an admin-triggered update, open or refresh **Admin settings**. The application update card shows any pending database migrations. Select **Update database** to apply them through the Worker's D1 binding. The same runner initializes a new database during setup.

If the Cloudflare dashboard has a custom deploy command containing `wrangler d1 migrations apply DB --remote`, remove that part and use `npm run deploy`.

Each migration and its `d1_migrations` history entry run in one D1 batch. If a migration fails, its changes are rolled back, the failed filename is shown, and it can be retried after the problem is corrected. Wrangler remains available as a manual recovery tool.

New application releases must remain compatible with the previous schema until an administrator applies their migrations. Prefer additive changes, keep old columns during the transition, and avoid making authentication or the admin settings page depend immediately on a newly added column. Plan a maintenance window for an incompatible schema change.

Configure these Worker values:

- `GITHUB_UPDATE_TOKEN` — a fine-grained GitHub token for the installation repository with Actions write permission.
- `GITHUB_UPDATE_REPO` — the installation repository in `owner/repository` format.
- `GITHUB_UPDATE_REF` — an optional update branch. The repository's default branch is used when omitted.

Optional repository variables:

- `UPDATE_SOURCE_REPOSITORY` — the upstream repository. Defaults to `hieunc229/mailflare`.

If an older installation still runs migrations in its updater, copy the latest `.github/workflows/deploy-update.yml` into that installation once. A workflow already running cannot update itself before executing its old migration step.

When adding a schema change, create a new uniquely named SQL file in `drizzle/migrations` and do not edit an applied migration. Build and development commands generate the Worker migration bundle from those files. `npm run db:bundle` can generate it explicitly.

