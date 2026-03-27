# LinkVault

**Your Personal AI-Powered Link Library**

LinkVault is a full-stack bookmark management application that uses AI to automatically analyze, categorize, and enrich every link you save. Built as a monorepo with a Next.js frontend, Express API backend, shared type package, and a Chrome extension, it provides a polished, production-grade experience for organizing and rediscovering your saved content.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Set Up the Database](#4-set-up-the-database)
  - [5. Run the Development Servers](#5-run-the-development-servers)
- [Chrome Extension Setup](#chrome-extension-setup)
- [Environment Variables Reference](#environment-variables-reference)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Design System](#design-system)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Application Limits](#application-limits)
- [License](#license)

---

## Features

### Core

- **Link Management** -- Save, edit, delete, pin, and organize links into collections.
- **AI-Powered Analysis** -- Every saved link is automatically scraped and analyzed by Google Gemini to generate a descriptive title, summary, tags, category, and emoji.
- **Collections** -- Organize links into named collections with custom emojis. Six default collections are seeded on first login.
- **Full-Text Search** -- PostgreSQL `tsvector`-based search with weighted ranking across titles, descriptions, domains, and tags. Falls back to `ILIKE` for short queries.
- **Authentication** -- Email/password and magic link authentication via Supabase Auth. All data is isolated per user with Row-Level Security.

### AI Features

- **Auto-Categorization** -- Links are classified into one of 11 categories (article, video, recipe, product, tutorial, tool, news, social, music, podcast, other).
- **AI Tag Suggestions** -- Request additional tag recommendations for any saved link, powered by Gemini analysis of page content.
- **AI Summary Panel** -- Expand any link card to view its AI-generated summary inline.
- **Semantic Search** -- Natural language queries interpreted by AI into structured filters (e.g., "unread React tutorials" becomes `{ keywords: "React", category: "tutorial", reading_status: "unread" }`).
- **Weekly AI Digest** -- Generate an editorial-style summary of recently saved links, including highlights, themes, and usage statistics.

### Organization

- **Tag Management** -- View all tags with usage counts. Rename, delete, or merge tags across your entire library.
- **Smart Collections** -- Rule-based virtual collections that auto-populate based on filter conditions (category, domain, tag, pinned status, reading status) with AND/OR matching.
- **Reading Queue** -- Mark links as unread/read with timestamps. Dedicated reading queue view with filtering.
- **Duplicate Detection** -- Aggressive URL canonicalization groups near-duplicate links for review and merging.
- **Link Health Monitor** -- On-demand scan of all saved links to detect broken URLs, redirects, and timeouts (10 concurrent requests, 10-second timeout).

### Data Portability

- **Import** -- Upload browser bookmark exports (Netscape HTML format) from Chrome, Firefox, Safari, or Edge. Up to 500 bookmarks per import, with duplicate detection.
- **Export** -- Download your entire library in JSON, CSV, HTML (Netscape Bookmark), or Markdown format.

### User Experience

- **Editorial Design System** -- Dark, warm-toned interface with Syne (display) and DM Sans (body) typography, terracotta accents, and gold AI indicators.
- **Responsive Layout** -- Desktop sidebar navigation with mobile hamburger drawer and bottom navigation bar.
- **Infinite Scroll** -- IntersectionObserver-based auto-loading with page-number navigation available as an alternative.
- **Optimistic Updates** -- Pin, reading status, bulk move, and delete operations update the UI immediately with automatic rollback on failure.
- **Undo Delete** -- Deleted links show a 5-second toast with an undo button; the actual API delete fires only after the timeout.
- **Keyboard Shortcuts** -- Navigate links with arrow keys, open with Enter, pin with `p`, delete with `d`, focus search with `/`, and more.
- **Bulk Operations** -- Select multiple links for bulk delete or bulk move to a collection.
- **Analytics Dashboard** -- Visual breakdown of total links, pinned/unread counts, 30-day activity chart, top categories, domains, tags, and collections.
- **Error Boundaries** -- React error boundaries with editorial-styled fallback UI at both page and component levels.
- **Chrome Extension** -- Save the current tab to LinkVault with one click. Manifest V3, email/password authentication, collection picker.

---

## Architecture

```
                    +------------------+
                    |  Chrome Extension |
                    |   (Manifest V3)  |
                    +--------+---------+
                             |
                             | REST API calls
                             v
+-------------------+    +-------------------+    +-------------------+
|   Next.js 14      |    |   Express API     |    |   Supabase        |
|   (App Router)    +--->+   (Node.js)       +--->+   (PostgreSQL)    |
|                   |    |                   |    |                   |
|   - React 18      |    |   - Auth MW       |    |   - Auth          |
|   - Tailwind CSS  |    |   - Rate Limiting |    |   - RLS Policies  |
|   - Zustand       |    |   - Zod Validation|    |   - Full-Text     |
|   - TypeScript    |    |   - Pino Logger   |    |     Search        |
+-------------------+    |   - Sentry        |    |   - Triggers      |
                         |   - Helmet        |    |   - Functions     |
                         +--------+----------+    +-------------------+
                                  |
                                  | API calls
                                  v
                         +-------------------+
                         |   Google Gemini   |
                         |   (gemini-2.0-    |
                         |    flash)         |
                         +-------------------+
```

- **Frontend** communicates with the Express API over HTTP (`NEXT_PUBLIC_API_URL`).
- **API** authenticates requests by verifying Supabase JWTs, then queries Supabase PostgreSQL with the service role key.
- **AI operations** are handled server-side by the API, which scrapes page content with Cheerio and sends it to Google Gemini for analysis.
- **Chrome Extension** authenticates directly with the Supabase REST API and calls the Express API to save links.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js (App Router) | 14.2+ |
| **UI Framework** | React | 18.3+ |
| **Styling** | Tailwind CSS | 3.4+ |
| **State Management** | Zustand | 5.0+ |
| **Language** | TypeScript | 5.7+ |
| **Backend** | Express | 4.21+ |
| **AI Engine** | Google Gemini API | gemini-2.0-flash |
| **Database** | Supabase (PostgreSQL) | -- |
| **Authentication** | Supabase Auth | -- |
| **Web Scraping** | Cheerio | 1.2+ |
| **Validation** | Zod | 3.24+ |
| **Logging** | Pino | 9.5+ |
| **Error Tracking** | Sentry | 10.46+ |
| **Security** | Helmet, CORS, Rate Limiting | -- |
| **Monorepo** | Turborepo + pnpm Workspaces | Turbo 2.4+ |
| **Extension** | Chrome Manifest V3 | -- |
| **CI/CD** | GitHub Actions | -- |
| **Runtime** | Node.js | 20+ |

---

## Project Structure

```
linkvault/
├── apps/
│   ├── web/                          # Next.js 14 frontend
│   │   ├── public/                   # Static assets, web manifest
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/           # Auth pages (login, signup, forgot/reset password)
│   │       │   ├── (dashboard)/      # Protected dashboard pages
│   │       │   │   ├── page.tsx              # All Links (home)
│   │       │   │   ├── layout.tsx            # Dashboard shell (sidebar, search, modals)
│   │       │   │   ├── collection/[slug]/    # Collection view
│   │       │   │   ├── tags/                 # Tag management
│   │       │   │   ├── duplicates/           # Duplicate detection
│   │       │   │   ├── reading-queue/        # Reading queue
│   │       │   │   ├── link-health/          # Link health monitor
│   │       │   │   ├── smart-collections/    # Smart collections
│   │       │   │   ├── digest/               # AI weekly digest
│   │       │   │   ├── analytics/            # Analytics dashboard
│   │       │   │   └── settings/             # Profile, security, import/export
│   │       │   ├── auth/                     # Auth callback routes
│   │       │   ├── globals.css               # Design system CSS variables and classes
│   │       │   └── layout.tsx                # Root layout (fonts, metadata)
│   │       ├── components/
│   │       │   ├── ai/               # AI-related components (AIBadge)
│   │       │   ├── auth/             # Auth components (AuthGuard, LoginForm, SignupForm)
│   │       │   ├── collections/      # Collection modals (Add, Edit, Delete)
│   │       │   ├── layout/           # Layout components (UserMenu)
│   │       │   ├── links/            # Link components (LinkGrid, LinkCard, modals, etc.)
│   │       │   ├── providers/        # Context providers (AuthProvider)
│   │       │   └── ui/               # Shared UI (ErrorBoundary, Toast, Pagination, etc.)
│   │       ├── hooks/                # Custom React hooks
│   │       ├── lib/                  # Utilities (API client, export generators, helpers)
│   │       └── stores/               # Zustand state stores
│   │
│   ├── api/                          # Express.js backend
│   │   └── src/
│   │       ├── config/               # Environment, CORS, Supabase client
│   │       ├── controllers/          # Request handlers (8 controllers)
│   │       ├── middleware/            # Auth, error handler, rate limiting, validation
│   │       ├── routes/               # Route definitions (11 route files)
│   │       ├── services/             # Business logic (9 services)
│   │       ├── utils/                # Helpers (API response, bookmark parser, logger, scraper)
│   │       ├── validators/           # Zod request schemas (5 validator files)
│   │       ├── index.ts              # Express app entry point
│   │       └── instrument.ts         # Sentry instrumentation
│   │
│   └── extension/                    # Chrome extension (Manifest V3)
│       ├── manifest.json             # Extension manifest
│       ├── config.json               # Runtime configuration
│       ├── popup.html                # Extension popup UI
│       ├── popup.css                 # Dark editorial-themed styles
│       ├── popup.js                  # Popup logic (auth, save, collection picker)
│       ├── background.js             # Service worker
│       └── icons/                    # Extension icons
│
├── packages/
│   └── shared/                       # Shared TypeScript types and utilities
│       └── src/
│           ├── types/                # Type definitions (link, collection, AI, API)
│           ├── constants/            # Shared constants (categories, collections, limits)
│           ├── validators/           # URL validation utilities
│           └── index.ts              # Barrel exports
│
├── supabase/
│   └── migrations/                   # Database migrations (8 files)
│
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI pipeline
│
├── turbo.json                        # Turborepo pipeline configuration
├── pnpm-workspace.yaml               # pnpm workspace definition
├── tsconfig.base.json                # Shared TypeScript configuration
├── .eslintrc.js                      # ESLint configuration
├── .prettierrc                       # Prettier configuration
└── package.json                      # Root package.json
```

---

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.15.0
- **Supabase** account and project ([supabase.com](https://supabase.com))
- **Google Gemini API key** ([ai.google.dev](https://ai.google.dev))
- **Git**

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/linkvault.git
cd linkvault
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs dependencies for all workspace packages (`apps/web`, `apps/api`, `packages/shared`).

### 3. Configure Environment Variables

Create environment files for both the API and the web frontend.

**API** (`apps/api/.env`):

```env
# Server
PORT=4000
NODE_ENV=development

# Supabase (from Supabase Dashboard > Settings > API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# CORS (comma-separated origins)
CORS_ORIGIN=http://localhost:3000

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10

# Sentry (optional)
SENTRY_DSN=
```

**Web Frontend** (`apps/web/.env.local`):

```env
# Supabase (from Supabase Dashboard > Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=
```

### 4. Set Up the Database

Run the Supabase migrations in order. Navigate to the **Supabase Dashboard > SQL Editor** and execute each migration file sequentially:

```
supabase/migrations/00001_create_profiles.sql
supabase/migrations/00002_create_collections.sql
supabase/migrations/00003_create_links.sql
supabase/migrations/00004_create_rls_policies.sql
supabase/migrations/00005_add_fulltext_search.sql
supabase/migrations/00006_add_tag_management.sql
supabase/migrations/00007_add_reading_queue.sql
supabase/migrations/00008_add_smart_collections.sql
```

These migrations create all tables, indexes, RLS policies, triggers, and database functions. See [Database Schema](#database-schema) for details.

Alternatively, if you have the Supabase CLI configured:

```bash
supabase db push
```

### 5. Run the Development Servers

From the repository root:

```bash
pnpm dev
```

This starts both servers concurrently via Turborepo:

| Service | URL |
|---------|-----|
| Web Frontend | `http://localhost:3000` |
| API Backend | `http://localhost:4000` |

To run individual services:

```bash
# Web only
pnpm dev --filter @linkvault/web

# API only
pnpm dev --filter @linkvault/api
```

---

## Chrome Extension Setup

The Chrome extension lives at `apps/extension/` and requires no build step.

1. **Configure the extension**. Edit `apps/extension/config.json` with your Supabase and API credentials:

```json
{
  "supabase_url": "https://your-project.supabase.co",
  "supabase_anon_key": "your-anon-key",
  "api_base_url": "http://localhost:4000/api/v1"
}
```

2. **Load the extension in Chrome**:
   - Navigate to `chrome://extensions`
   - Enable **Developer mode** (toggle in the top right)
   - Click **Load unpacked**
   - Select the `apps/extension` directory

3. **Sign in** using your email and password. The extension authenticates via the Supabase REST API and stores the JWT in `chrome.storage.local`.

4. **Save links** by clicking the extension icon on any page. Select an optional collection and click Save.

---

## Environment Variables Reference

### API (`apps/api/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4000` | HTTP server port |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`, `test`) |
| `SUPABASE_URL` | **Yes** | -- | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | -- | Supabase service role key (server-side only) |
| `GEMINI_API_KEY` | **Yes** | -- | Google Gemini API key |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | No | `10` | Maximum requests per rate limit window |
| `SENTRY_DSN` | No | -- | Sentry DSN for error tracking |

### Web Frontend (`apps/web/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | -- | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | -- | Supabase anonymous/public key |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:4000/api/v1` | Backend API base URL |
| `NEXT_PUBLIC_SENTRY_DSN` | No | -- | Sentry DSN for frontend error tracking |
| `SENTRY_ORG` | No | -- | Sentry organization slug (source maps) |
| `SENTRY_PROJECT` | No | -- | Sentry project slug (source maps) |
| `SENTRY_AUTH_TOKEN` | No | -- | Sentry auth token (source map uploads) |

---

## API Reference

All endpoints are prefixed with `/api/v1` unless otherwise noted. Authenticated endpoints require a `Authorization: Bearer <supabase_jwt>` header.

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | No | Service health check |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/setup` | Yes | First-login setup (seeds default collections) |
| `GET` | `/api/v1/auth/me` | Yes | Get current user profile |

### Links

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/links` | Yes | List links with filters, search, and pagination |
| `GET` | `/api/v1/links/export` | Yes | Export all links for download |
| `GET` | `/api/v1/links/:id` | Yes | Get a single link by ID |
| `POST` | `/api/v1/links` | Yes | Create a new link (triggers AI analysis) |
| `POST` | `/api/v1/links/import` | Yes | Import bookmarks from HTML file |
| `PATCH` | `/api/v1/links/:id` | Yes | Update a link |
| `DELETE` | `/api/v1/links/:id` | Yes | Delete a link |
| `POST` | `/api/v1/links/bulk-delete` | Yes | Delete multiple links |
| `PATCH` | `/api/v1/links/bulk-move` | Yes | Move multiple links to a collection |

**Query Parameters for `GET /links`:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Full-text search query |
| `collection_id` | UUID | Filter by collection |
| `category` | string | Filter by category |
| `is_pinned` | boolean | Filter pinned links |
| `reading_status` | `unread` \| `read` | Filter by reading status |
| `sort_by` | `created_at` \| `title` \| `domain` \| `category` | Sort field |
| `sort_dir` | `asc` \| `desc` | Sort direction |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

### Collections

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/collections` | Yes | List all collections |
| `POST` | `/api/v1/collections` | Yes | Create a collection |
| `PATCH` | `/api/v1/collections/:id` | Yes | Update a collection |
| `DELETE` | `/api/v1/collections/:id` | Yes | Delete a collection |

### AI

All AI endpoints are rate-limited (default: 10 requests per minute per user).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/ai/summarize` | Yes | Analyze and summarize a URL |
| `POST` | `/api/v1/ai/suggest-tags` | Yes | Get AI tag suggestions for a link |
| `POST` | `/api/v1/ai/semantic-search` | Yes | Interpret natural language into search filters |
| `POST` | `/api/v1/ai/digest` | Yes | Generate an AI digest of recent links |

### Tags

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/tags` | Yes | List all tags with usage counts |
| `PATCH` | `/api/v1/tags/rename` | Yes | Rename a tag across all links |
| `POST` | `/api/v1/tags/delete` | Yes | Delete a tag from all links |
| `POST` | `/api/v1/tags/merge` | Yes | Merge multiple tags into one |

### Duplicates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/duplicates` | Yes | Detect duplicate link groups |
| `POST` | `/api/v1/duplicates/merge` | Yes | Merge a duplicate group (keep one, delete rest) |

### Link Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/link-health/scan` | Yes | Scan all links for broken/redirected URLs |

### Smart Collections

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/smart-collections` | Yes | List all smart collections |
| `GET` | `/api/v1/smart-collections/:id` | Yes | Get a smart collection by ID |
| `GET` | `/api/v1/smart-collections/:id/links` | Yes | Get links matching collection rules |
| `POST` | `/api/v1/smart-collections` | Yes | Create a smart collection |
| `PATCH` | `/api/v1/smart-collections/:id` | Yes | Update a smart collection |
| `DELETE` | `/api/v1/smart-collections/:id` | Yes | Delete a smart collection |

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/analytics` | Yes | Get user analytics and statistics |

---

## Database Schema

LinkVault uses Supabase PostgreSQL with 4 tables, Row-Level Security on all tables, full-text search, and 7 database functions.

### Tables

#### `profiles`

Automatically created when a user signs up via the `handle_new_user()` trigger.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | References `auth.users(id)` |
| `email` | TEXT | User's email address |
| `display_name` | TEXT | Display name |
| `avatar_url` | TEXT | Avatar image URL |
| `created_at` | TIMESTAMPTZ | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

#### `collections`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK) | Owner reference |
| `name` | TEXT | Collection name |
| `slug` | TEXT | URL-friendly identifier (unique per user) |
| `emoji` | TEXT | Collection emoji icon (default: `📁`) |
| `color` | TEXT | Collection color (default: `#6366f1`) |
| `is_default` | BOOLEAN | Whether this is a system default collection |
| `position` | INTEGER | Display order |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

#### `links`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK) | Owner reference |
| `collection_id` | UUID (FK) | Collection reference (nullable, SET NULL on delete) |
| `url` | TEXT | Link URL (unique per user) |
| `title` | TEXT | AI-generated or scraped title |
| `description` | TEXT | AI-generated summary |
| `tags` | TEXT[] | Array of tags (GIN-indexed) |
| `category` | TEXT | AI-assigned category |
| `emoji` | TEXT | AI-assigned emoji |
| `domain` | TEXT | Extracted domain name |
| `favicon_url` | TEXT | Site favicon URL |
| `is_pinned` | BOOLEAN | Whether the link is pinned |
| `ai_processed` | BOOLEAN | Whether AI analysis has been completed |
| `reading_status` | TEXT | `unread`, `read`, or `NULL` |
| `read_at` | TIMESTAMPTZ | When the link was marked as read |
| `search_vector` | TSVECTOR | Full-text search index (auto-maintained by trigger) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp (auto-maintained by trigger) |

#### `smart_collections`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK) | Owner reference |
| `name` | TEXT | Smart collection name |
| `emoji` | TEXT | Display emoji |
| `rules` | JSONB | Array of filter rules (`{ field, operator, value }`) |
| `match_mode` | TEXT | `all` (AND) or `any` (OR) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### Row-Level Security

All tables have RLS enabled. Every policy restricts operations to rows where `auth.uid()` matches the user's ID column, ensuring complete data isolation between users.

### Database Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Trigger function that auto-creates a profile row when a new user signs up |
| `update_updated_at_column()` | Trigger function that sets `updated_at = now()` on link updates |
| `links_search_vector_update()` | Trigger function that builds weighted tsvector from title (A), description (B), domain (C), and tags (C) |
| `get_collection_link_counts(user_id)` | Returns link counts per collection for the given user |
| `get_user_tags(user_id)` | Returns all unique tags with usage counts for the given user |
| `rename_user_tag(user_id, old_tag, new_tag)` | Renames a tag across all of the user's links |
| `delete_user_tag(user_id, tag)` | Removes a tag from all of the user's links |
| `merge_user_tags(user_id, source_tags[], target_tag)` | Merges multiple source tags into a single target tag |

### Indexes

| Index | Table | Columns | Type |
|-------|-------|---------|------|
| `idx_profiles_email` | profiles | `(email)` | B-tree |
| `idx_collections_user_id` | collections | `(user_id)` | B-tree |
| `idx_collections_slug` | collections | `(user_id, slug)` | B-tree |
| `idx_links_user_id_created` | links | `(user_id, created_at DESC)` | B-tree |
| `idx_links_collection_id` | links | `(collection_id)` | B-tree |
| `idx_links_user_category` | links | `(user_id, category)` | B-tree |
| `idx_links_user_pinned` | links | `(user_id, is_pinned DESC, created_at DESC)` | B-tree |
| `idx_links_domain` | links | `(user_id, domain)` | B-tree |
| `idx_links_tags` | links | `(tags)` | GIN |
| `idx_links_search_vector` | links | `(search_vector)` | GIN |
| `idx_links_user_reading_status` | links | `(user_id, reading_status, created_at DESC)` | B-tree |
| `idx_smart_collections_user` | smart_collections | `(user_id, created_at DESC)` | B-tree |

---

## Design System

LinkVault uses a custom editorial design system built on Tailwind CSS with CSS custom properties.

### Typography

| Usage | Font | Weight |
|-------|------|--------|
| Display / Headings | Syne | Bold (700) |
| Body / UI Text | DM Sans | Regular (400), Medium (500) |
| Monospace (domains, code) | System monospace | -- |

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `ink` (base) | `#0a0a0c` | Primary background |
| `paper` | `#e8e4de` | Primary text |
| `accent` | `#c45d3e` | Interactive elements, active states |
| `gold` | `#c9a84c` | AI-related indicators and highlights |
| `danger` | `#d94f4f` | Destructive actions, errors |
| `success` | `#3fae7a` | Success states, confirmations |

### Design Principles

- **Sharp corners** -- Border radii are minimal (`3px`, `6px`, `8px`) for a structured editorial feel.
- **Warm dark palette** -- Avoids pure black and white in favor of warm ink and paper tones.
- **Gold for AI** -- All AI-powered features, indicators, and loading states use the gold accent to clearly distinguish AI from user actions.
- **Monospace index prefixes** -- Sidebar navigation items in the Manage section use monospace characters (`#`, `=`, `>`, `~`, `*`, `+`, `%`) as visual anchors.

### Component Classes

Reusable editorial component classes are defined in `apps/web/src/app/globals.css`:

| Class | Description |
|-------|-------------|
| `.editorial-label` | Uppercase tracking label for section headers |
| `.input-editorial` | Styled form input with editorial border and focus states |
| `.btn-primary` | Terracotta accent button |
| `.btn-ghost` | Transparent text-only button |
| `.btn-danger` | Red destructive action button |
| `.modal-backdrop` | Semi-transparent overlay background |
| `.modal-panel` | Modal container with editorial border and shadow |
| `.modal-header` | Modal header row with bottom border |
| `.modal-title` | Modal heading typography |
| `.hairline` | Thin 1px divider line |
| `.card-accent-top` | Accent-colored top border for cards |
| `.mono-domain` | Monospace-styled domain text |

---

## Scripts

### Root (Turborepo)

| Script | Command | Description |
|--------|---------|-------------|
| `pnpm dev` | `turbo run dev` | Start all development servers |
| `pnpm build` | `turbo run build` | Build all packages |
| `pnpm lint` | `turbo run lint` | Lint all packages |
| `pnpm type-check` | `turbo run type-check` | TypeScript type checking |
| `pnpm clean` | `turbo run clean` | Remove build artifacts |
| `pnpm format` | `prettier --write` | Format all source files |

### Web (`apps/web`)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev --port 3000` | Start Next.js dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint |
| `type-check` | `tsc --noEmit` | TypeScript check |
| `clean` | `rm -rf .next` | Remove build output |

### API (`apps/api`)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `nodemon` | Start Express dev server with hot reload |
| `build` | `tsc` | Compile TypeScript |
| `start` | `node dist/index.js` | Start compiled production server |
| `lint` | `eslint src/` | Run ESLint |
| `type-check` | `tsc --noEmit` | TypeScript check |
| `clean` | `rm -rf dist` | Remove build output |

---

## Deployment

### Frontend (Vercel)

1. Import the repository in [Vercel](https://vercel.com).
2. Set the **Root Directory** to `apps/web`.
3. Set the **Build Command** to `pnpm build`.
4. Add the required environment variables (see [Environment Variables Reference](#environment-variables-reference)).
5. Update `NEXT_PUBLIC_API_URL` to point to your deployed API URL.

### Backend (Render)

1. Create a new **Web Service** on [Render](https://render.com).
2. Set the **Root Directory** to `apps/api`.
3. Set the **Build Command** to `pnpm install && pnpm build`.
4. Set the **Start Command** to `node dist/index.js`.
5. Add all required environment variables.
6. Update `CORS_ORIGIN` to include your Vercel frontend URL.

### Chrome Extension

1. Update `apps/extension/config.json` with production URLs.
2. Package the `apps/extension` directory as a ZIP.
3. Upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on pushes and pull requests to `main`:

1. **Lint & Type Check** -- Installs dependencies, runs `pnpm type-check` and `pnpm lint`.
2. **Build** -- Runs `pnpm build` to verify compilation succeeds.

Both jobs use Node.js 20 and pnpm 9 with dependency caching.

---

## Application Limits

| Constraint | Value |
|-----------|-------|
| Maximum tags per link | 5 |
| Maximum tag length | 30 characters |
| Maximum title length | 200 characters |
| Maximum description length | 500 characters |
| Maximum URL length | 2,048 characters |
| Maximum collection name length | 50 characters |
| Maximum custom collections | 20 |
| Default page size | 20 items |
| Maximum page size | 100 items |
| AI rate limit | 10 requests / minute |
| Maximum import file size | 5 MB |
| Maximum bookmarks per import | 500 |
| Import rate limit | 5 imports / hour |
| General API rate limit | 100 requests / minute |

---

## License

This project is private and not licensed for public distribution.
