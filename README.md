# The Kitchen Doc

A personal recipe app for browsing, organizing, and managing a family recipe collection. Live at [www.thekitchendoc.com](https://www.thekitchendoc.com).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, JavaScript, no TypeScript) |
| Styling | Tailwind CSS v4 |
| ORM | Prisma 7 with `@prisma/adapter-pg` (connection pooling via `pg`) |
| Database | PostgreSQL hosted on Supabase |
| Auth | NextAuth v5 (beta) — GitHub OAuth, Google OAuth, magic link email |
| Storage | Supabase Storage (recipe images) |
| Email | Resend SDK (magic links, role request notifications) |
| AI | Anthropic API (recipe parsing from raw HTML) |
| Deployment | Vercel |

## Key Config Notes

- **`prisma.config.ts`** — Prisma configuration. Uses `DIRECT_URL` for the datasource and `DATABASE_URL` for migrations/direct access. Both point to Supabase.
- **`src/lib/prisma.js`** — Prisma client singleton. Uses `DATABASE_URL` in production and `DIRECT_URL` in development (Supabase requires the pooled URL in production via `@prisma/adapter-pg`).
- **`src/proxy.js`** — Next.js middleware (exported as `proxy`, re-exported from `middleware.js`). Handles auth-gating for `/admin`, `/my-recipes`, and `/recipes` routes. Uses `realRole` so admin preview mode never locks out a real ADMIN.
- **`src/auth.js`** — NextAuth v5 config. JWT session strategy. Providers: GitHub, Google, and a custom `magic-link` Credentials provider. The `signIn` callback upserts users on OAuth sign-in. The `session` callback sets `realRole` and applies admin preview mode via cookie.

## Environment Variables

Create a `.env.local` file in the project root:

```bash
# Database (Supabase)
DATABASE_URL=          # Pooled connection string (used in production and for Prisma migrations)
DIRECT_URL=            # Direct connection string (used in development)

# NextAuth v5
AUTH_SECRET=           # Random secret — generate with: openssl rand -base64 32
NEXTAUTH_URL=          # Full base URL, e.g. http://localhost:3000 (dev) or https://www.thekitchendoc.com (prod)

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Resend (email)
RESEND_API_KEY=        # Used for magic link emails and role request notifications

# Supabase Storage
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic (AI recipe parsing)
ANTHROPIC_API_KEY=

# App config
ADMIN_EMAIL=           # Email address that receives role request notifications
```

## Getting Started

```bash
git clone https://github.com/your-username/thekitchendoc.git
cd thekitchendoc
npm install

# Copy and fill in your environment variables
cp .env.example .env.local   # or create .env.local manually

# Generate the Prisma client
npx prisma generate

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

### npm scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Run `prisma generate` then build for production |
| `npm start` | Start the production server |
| `npm test` | Run the Jest test suite |

### Import scripts (`/scripts`)

These are one-off CJS scripts for bulk data import. Run them in order:

| Script | Description |
|---|---|
| `node scripts/parseRecipes.cjs` | Parses `Meals.html` (Google Doc export) into structured JSON. Outputs `scripts/output.json` — review before proceeding. |
| `node scripts/importRecipes.cjs` | Reads `scripts/output.json` and bulk-inserts recipes, categories, and tags into the database via Prisma. |
| `node scripts/uploadImages.cjs` | Reads `scripts/output.json`, uploads each recipe image to Supabase Storage, and updates `imageUrl` in the database. Set `DRY_RUN=1` to preview without writing. |

## Roles

| Role | Permissions |
|---|---|
| `ADMIN` | Full access — manage recipes, categories, tags, users, and role requests. Can toggle a preview mode to browse as any role. |
| `CONTRIBUTOR` | Access to `/admin` recipe management. Can create, edit, and manage recipes. |
| `VIEWER` | Read-only access to recipes, categories, and tags. Can submit a role upgrade request from their profile. |

The first user to sign up via magic link is automatically assigned `ADMIN`. OAuth users are assigned `VIEWER` unless manually promoted.

## Features

- **Homepage** — Category grid with cover images, gradient overlays, and recipe counts
- **Recipe browsing** — Browse by category or tag; flat image grid with parent/variation ordering
- **Recipe detail** — Full recipe view with ingredients, steps, servings, and image; locked preview for unauthenticated visitors
- **Tags** — Tag index and per-tag recipe listing with breadcrumbs
- **Search** — Header search across recipes
- **Authentication** — GitHub OAuth, Google OAuth, and magic link email sign-in
- **Profile** — View account details; submit a role upgrade request with an optional message
- **Role requests** — Admin management page to approve or deny requests with a comment; email notifications to both admin and requester via Resend
- **My Recipes** — Authenticated recipe list, favorites, and new recipe form
- **Admin — Categories** — Drag-and-drop reorder (pointer and touch), sort order management, mobile-responsive
- **Admin — Recipes** — Recipe table with edit/delete
- **Admin — Users** — User list with role management
- **Admin — Requests** — Approve/deny role upgrade requests
- **Preview mode** — Admins can browse as VIEWER or CONTRIBUTOR to test the experience
- **Forbidden page** — Styled 403 page for unauthorized access attempts
- **AI recipe parsing** — Anthropic API integration for parsing raw recipe HTML into structured data

## Testing

Tests live in `__tests__/api/`. The suite uses Jest 30 with ESM module mocking (`jest.unstable_mockModule`) and requires Node 20.

```bash
npm test
```

Current coverage: API route handlers for `POST /api/role-requests`, `GET /api/role-requests`, and `PATCH /api/role-requests/[id]`.
