# Panda Closet

This project is a small online clothing shop built as a student project. The idea was to create a simple boutique website where customers can browse products, place orders, and contact the business. The admin dashboard lets the owner manage products, categories, messages, and store settings.

The app is built with React and Vite on the frontend, and a Cloudflare Worker handles the API and hosting. I kept the project simple and practical so it could be deployed on a free Cloudflare plan using D1 for data storage.

## Project purpose

Panda Closet is meant to be a lightweight storefront for a fashion boutique. It includes:

- a public product catalog
- product detail pages
- a simple order form
- a contact form
- a protected admin login
- product/category management
- store settings

## Tech stack

- Frontend: React, Vite, TypeScript
- API/backend: Cloudflare Worker
- Database: Cloudflare D1
- Styling: Tailwind CSS
- Auth: bcrypt hashing + Worker cookie sessions

## Important note about Cloudflare free plan

This version is designed to work without R2 storage because R2 is not available on the free plan.

That means:

- product images are not uploaded to Cloudflare storage
- image paths should be stored as URLs or local file references
- if you want image uploading, you will need a paid plan or a different storage provider

For this project, the app is set up to use D1 only and keep the setup simple.

## Local development

Make sure you have Node.js 22 or newer installed.

1. Install dependencies

```bash
npm install
```

2. Copy the example environment file if needed

```bash
cp .env.example .env
```

3. Start the local app

```bash
npm run dev
```

The frontend usually runs on:

- http://localhost:4173

The local backend in this project is still used for development, so the app may also rely on the Express server setup if you are running it manually.

## Cloudflare Worker setup

This project is intended to run as a single Cloudflare Worker that serves the built frontend and API routes.

1. Log in to Wrangler

```bash
npx wrangler login
```

2. Create a D1 database

```bash
npx wrangler d1 create panda-closet
```

3. Update your `wrangler.toml` file with the real D1 database ID

```toml
[[d1_databases]]
binding = "DB"
database_name = "panda-closet"
database_id = "YOUR_DATABASE_ID"
```

4. Run the project build

```bash
npm run build
```

5. Deploy

```bash
npx wrangler deploy
```

## Database setup

The app expects the D1 schema from the project database folder. If needed, apply the schema with Wrangler.

```bash
npx wrangler d1 execute panda-closet --file=./database/schema.sql --remote
```

## Admin setup

The project includes an admin flow for managing the shop.

For the Cloudflare version, create the first admin using a setup token or the admin setup route described in the project code.

The app uses a secure hashed password and cookie-based session management.

## Useful scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run deploy
npm run cf:dev
```

## Project structure

```text
/
├── src/                 # frontend React app
├── worker/              # Cloudflare Worker API
├── backend/             # local helper backend for dev/testing
├── database/            # SQL schema and database files
├── public/              # static assets
├── package.json         # project scripts and dependencies
├── vite.config.ts       # frontend config
├── wrangler.toml        # Cloudflare config
├── README.md            # project notes
└── .env.example         # environment example
```

## Notes for students

This project was created as a learning project to explore:

- React app structure
- REST API routes
- authentication and sessions
- database design with D1
- Cloudflare deployment
- full-stack app development in one project

It is not a production-ready SaaS system, but it is a working example of how to build a small store with cloud deployment.

## Final note

This project is a student-built demo and can be improved further with things like:

- real image hosting
- better admin dashboard UX
- stronger validation and error handling
- email notifications
- payment integration
- tests

If you want to expand it later, these are the next best features to add.
