<!--
Purpose: Project overview, setup instructions, and Cloudflare deployment guide.
Linked to: package.json, worker configuration, database schema, and developer workflows.
Note: This document explains how the app is run locally and deployed to Cloudflare.
-->
# Panda Closet

Panda Closet is a React storefront and protected admin dashboard. Production runs as one Cloudflare Worker serving the built frontend and API, with D1 for application data and R2 for product images.

## Architecture

- Frontend: React 19, React Router, and Vite; built into `dist/`.
- Production backend: `worker/src/index.js`, a Fetch API Cloudflare Worker.
- Database: Cloudflare D1, bound as `env.DB`.
- Product media: Cloudflare R2, bound as `env.PRODUCT_IMAGES` and served through `/api/images/*`.
- Local-only backend: Express, better-sqlite3, filesystem uploads, and SMTP in `backend/server.js`.

The production Worker also serves the static frontend from `dist/`, so browser API and admin session requests are same-origin. Production does not use the local SQLite database or `backend/uploads/`.

## Requirements

Use Node.js `22.22.0` (pinned by `.nvmrc`) and npm. The project lockfile is `package-lock.json`.

## Local development

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

The local storefront is at `http://localhost:4173`; Vite proxies `/api` to Express on port `3000`. Set a strong `ADMIN_PASSWORD` and `SESSION_SECRET` in `.env` before the first local run. Local data is stored in `backend/database.db` and local uploads are stored under `backend/uploads/`.

To exercise the Cloudflare implementation locally, apply the schema to Wrangler's local D1 and start the Worker:

```bash
npm run cf:db:apply
npm run cf:dev
```

The Worker is served at `http://localhost:8787`.

## Cloudflare setup

1. Authenticate Wrangler with your account:

```bash
npx wrangler login
```

2. Create the D1 database and R2 bucket:

```bash
npx wrangler d1 create panda-closet
npx wrangler r2 bucket create panda-closet-images
```

Copy the real D1 `database_id` printed by Wrangler into `wrangler.toml`, replacing `YOUR_D1_DATABASE_ID`. Do not invent an ID. The bucket name in Wrangler must match the bucket created in your account.

3. Apply the D1 schema to the remote database:

```bash
npx wrangler d1 execute panda-closet --file=./database/schema.sql --remote
```

For a database created before the `orders.location` column was added, apply this once instead of recreating the database:

```bash
npx wrangler d1 execute panda-closet --remote --command="ALTER TABLE orders ADD COLUMN location TEXT;"
```

Do not run that `ALTER TABLE` command on a database that already has the column.

4. Create an initial admin using a one-time Worker secret:

```bash
npx wrangler secret put ADMIN_SETUP_TOKEN
npm run deploy
```

Send one `POST /api/admin/create` request with an `Authorization: Bearer <token>` header and JSON containing `email`, `name`, and a password of at least 12 characters. This endpoint works only while the D1 `admins` table is empty. Then remove the setup secret:

```bash
npx wrangler secret delete ADMIN_SETUP_TOKEN
```

The Worker uses D1-backed, expiring HttpOnly sessions; it does not need a `SESSION_SECRET`. Do not place real secrets in `wrangler.toml`, `.env.example`, or Git.

5. Deploy and verify:

```bash
npm run deploy
npx wrangler deploy --dry-run
```

`npm run deploy` builds `dist/` and deploys the Worker. The application and `/api/*` routes share the Worker origin; no production `VITE_API_BASE_URL` is needed.

## GitHub deployment

In Cloudflare, connect the GitHub repository under Workers Builds and select the production branch you actually use. The repository root is the build root. Configure Node `22.22.0`, build command `npm run build`, and deploy command `npx wrangler deploy`. Wrangler reads `wrangler.toml`; keep the real D1 ID in that file and manage `ADMIN_SETUP_TOKEN` through Worker secrets only during initial setup.

Cloudflare's build connection supplies deployment authorization; do not commit an API token. Future deployments build `dist/`, then run Wrangler to publish the Worker and assets.

## APIs and user flows

Public routes include `GET /api/products`, `GET /api/products/:slug`, `GET /api/categories`, `GET /api/settings/public`, `POST /api/orders`, and `POST /api/messages`. Admin routes are checked against the D1 session on every request. Product uploads validate image type/size, store objects in R2, and keep object paths in D1.

WhatsApp buttons open a prefilled `wa.me` chat. This is not an automated WhatsApp Business API integration; the person using WhatsApp must send the prepared message. The Worker does not send email; SMTP settings in `.env` apply only to the local Express backend.

## Verification

```bash
npm run typecheck
npm run build
npm audit
npx wrangler deploy --dry-run
```

Use the browser to verify home/shop/product deep links, product images, public categories/settings, customer order and contact submissions, admin login/session/logout, and protected admin operations after configuring real Cloudflare resources.
