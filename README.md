# SuperPatch D2C Sales Enablement Platform

A Next.js 16 web application for SuperPatch direct-to-consumer sales representatives. Provides a guided, multi-product sales conversation flow with contact tracking, auto-save, and product-specific scripts powered by roadmap spec data.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| UI | React 19, shadcn/ui (New York style), Tailwind CSS 4 |
| Auth & DB | Supabase (Auth, PostgreSQL, RLS, Server Actions) |
| State | React useState/useCallback/useEffect (no external state library) |
| Deployment | Vercel |
| Repository | [github.com/SuperPatchAi/Star](https://github.com/SuperPatchAi/Star) |

## Architecture Overview

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Root redirect → /sales
│   ├── layout.tsx          # Root layout (fonts, metadata, Toaster)
│   ├── globals.css         # Tailwind + CSS variables + themes
│   ├── (auth)/             # Auth group (login, signup, callbacks)
│   ├── sales/              # Main sales flow entry point
│   ├── contacts/           # Contact management (list + Kanban)
│   ├── products/           # Product catalog (reference only)
│   ├── evidence/           # Clinical evidence page
│   ├── practice/           # Objection flashcards
│   ├── favorites/          # Saved scripts/objections
│   ├── roadmaps/           # Roadmap image gallery
│   └── api/auth/           # Auth API routes (signout)
├── components/
│   ├── layout/             # AppShell, AppSidebar
│   ├── sales-flow/         # Decision tree + all step components
│   ├── contacts/           # Contact table, Kanban, sheet
│   └── ui/                 # shadcn/ui primitives
├── lib/
│   ├── auth.ts             # Auth helpers (getAuthUser, requireAdmin)
│   ├── security.ts         # Redirect/input sanitization
│   ├── utils.ts            # cn() class merge utility
│   ├── roadmap-data.ts     # Roadmap spec loading functions
│   ├── supabase/           # Supabase clients (server, client, middleware)
│   ├── actions/            # Server actions (contacts CRUD)
│   └── db/                 # Database TypeScript types
├── data/
│   ├── products.ts         # Product catalog (13 products)
│   ├── roadmap-specs-v2/   # 13 product-specific JSON roadmap specs
│   ├── roadmap-specs/      # Legacy v1 specs (unused by app)
│   └── wordtracks/         # D2C word track scripts per product
├── types/
│   ├── index.ts            # Product, WordTrack, NavItem types
│   ├── roadmap.ts          # RoadmapV2 types + SALES_STEPS constant
│   └── wordtrack.ts        # WordTrack section types
├── contexts/               # AuthContext provider
├── hooks/                  # useAuth, useIsMobile
└── proxy.ts                # Next.js middleware (auth guard)
```

## Sales Conversation Flow

The core feature is an 8-step guided sales conversation. Each step renders product-specific content from roadmap spec JSON files.

### Step Sequence

```
1. Add Contact     → Create contact with first/last name, select products
2. Opening         → Choose approach type (Cold, Warm, DM, Referral, Event)
3. Discovery       → Check off discovery questions asked (3-5 required)
4. Presentation    → Problem-Agitate-Solve framework with contextual callbacks
5. Send Samples    → Offer samples, select products, capture address
6. Objections      → Handle objections with scripted responses
7. Close           → Select closing technique
8. Follow-Up       → Follow-up sequence and outcome tracking
```

### Data Flow Diagram

```
User lands on /sales
        │
        ▼
┌─────────────────┐     ┌──────────────────┐
│  DecisionTree   │────▶│  StepAddContact   │  Step 0: Gate
│  (client state) │     │  Creates contact  │
└────────┬────────┘     └──────────────────┘
         │                       │
         │  onContactCreated     │  createContact() server action
         │◀──────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Steps 1-7: Product-specific content    │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ ProductTabs  │──│ Step Component   │  │
│  │ (per product)│  │ (roadmap data)   │  │
│  └─────────────┘  └──────────────────┘  │
│                                         │
│  Auto-save on every state change        │
│  (500ms debounce → updateContact())     │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   Supabase      │
│   d2c_contacts  │
│   (PostgreSQL)  │
└─────────────────┘
```

### Multi-Product Support

- Contacts can have multiple products (`product_ids: text[]`)
- The `ProductTabs` component renders a tabbed interface when multiple products are selected
- Per-product state is stored as JSONB objects keyed by product ID:
  - `opening_types: { "freedom": "COLD APPROACH", "rem": "WARM INTRO" }`
  - `questions_asked: { "freedom": ["q1", "q2"], "rem": ["q3"] }`
  - `objections_encountered: { "freedom": ["TOO EXPENSIVE"] }`
  - `closing_techniques: { "freedom": "ASSUMPTIVE" }`

### Contextual Presentation

The Presentation step (Problem-Agitate-Solve) uses a `{{discovery_callback}}` placeholder in the agitate phase. At render time, `StepPresentation` replaces this with a sentence referencing the actual discovery questions the user checked off, creating a personalized script.

### Resume Flow

Contacts can be resumed from:
- **Contacts page** → "Resume" button → `/sales?contactId=xxx`
- **Kanban board** → card click → `/sales?contactId=xxx`

The `DecisionTree` loads the contact's `current_step` and all saved state.

## Authentication

| Route | Purpose |
|-------|---------|
| `/login` | Email/password sign-in |
| `/signup` | Invite-only registration (requires `?token`) |
| `/auth/callback` | OAuth PKCE code exchange |
| `/auth/confirm` | Email OTP verification |
| `/api/auth/signout` | Session destruction |

### Auth Guard (Middleware)

`src/proxy.ts` → `src/lib/supabase/middleware.ts`:
- Refreshes Supabase session on every request
- Redirects unauthenticated users to `/login`
- Restricts `/signup` to invite-token URLs
- Redirects authenticated users away from `/login` → `/`

### Supabase Clients

| Client | File | Usage |
|--------|------|-------|
| Browser | `src/lib/supabase/client.ts` | Client components (login, signup) |
| Server | `src/lib/supabase/server.ts` | Server actions, layouts, pages |
| Admin | `src/lib/supabase/server.ts` | Bypass RLS for profile fetching |

## Database Schema

### `d2c_contacts` Table

```sql
create table public.d2c_contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  product_ids     text[] not null default '{}',
  first_name      text not null,
  last_name       text not null,
  email           text,
  phone           text,
  address_line1   text,
  address_line2   text,
  address_city    text,
  address_state   text,
  address_zip     text,
  notes           text,
  current_step    text not null default 'add_contact',
  opening_types   jsonb default '{}'::jsonb,
  questions_asked jsonb default '{}'::jsonb,
  objections_encountered jsonb default '{}'::jsonb,
  closing_techniques jsonb default '{}'::jsonb,
  sample_sent     boolean not null default false,
  sample_sent_at  timestamptz,
  sample_products text[] default '{}',
  outcome         text default 'pending',
  follow_up_day   integer,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);
```

- **RLS**: All policies enforce `auth.uid() = user_id` (select, insert, update, delete)
- **Indexes**: `user_id`, `product_ids` (GIN), `outcome`, `current_step`

### `user_profiles` Table

Referenced in code but migration lives outside this repo. Fields: `id`, `email`, `full_name`, `avatar_url`, `role` (admin/user), `is_active`, `invited_by`, `created_at`, `updated_at`.

## Roadmap Spec Structure (V2)

Each product has a JSON file in `src/data/roadmap-specs-v2/` following the `RoadmapV2` TypeScript interface:

```
{
  metadata:   { product, category, tagline, benefits[], type, purpose, generated }
  sections:
    1_customer_profile:    { demographics[], pain_points[], psychographics[], tried_before[] }
    2_opening_approaches:  { approaches[]: { type, context, script } }  — 5 per product
    3_discovery_questions: { questions[]: { type, question } }          — 10 per product
    4_presentation:        { problem, agitate (with {{discovery_callback}}), solve, key_benefits[], differentiator }
    5_objection_handling:  { objections[]: { objection, trigger, response, psychology } } — 8 per product
    6_closing:             { techniques[]: { name, script, when, icon } }                — 5 per product
    7_followup:            { sequence[]: { day, action, template, channel } }
}
```

All 13 products have fully customized, product-specific content across all sections.

## Products (13 Total)

| ID | Name | Category | Focus |
|----|------|----------|-------|
| freedom | Freedom | Pain | Drug-free pain relief |
| rem | REM | Sleep | Deeper, better sleep |
| liberty | Liberty | Balance | Balance and mobility |
| boost | Boost | Energy | Clean, sustained energy |
| victory | Victory | Performance | Athletic performance |
| focus | Focus | Focus | Mental clarity |
| defend | Defend | Immune | Immune support |
| ignite | Ignite | Weight | Metabolic support |
| kick-it | Kick It | Wellness | Willpower / habit breaking |
| peace | Peace | Wellness | Stress management |
| joy | Joy | Wellness | Mood enhancement |
| lumi | Lumi | Beauty | Skin / beauty support |
| rocket | Rocket | Men's Health | Men's vitality |

## Key Components

### DecisionTree (`src/components/sales-flow/decision-tree.tsx`)
The central orchestrator. Manages:
- `activeContact` state (Contact or null)
- `currentStepIndex` (0-7)
- `DecisionTreeState` (per-product openings, questions, objections, closings, samples)
- Auto-save via `useEffect` with 500ms debounce
- Contact gating (step 0 must be completed before proceeding)
- Loads multiple roadmaps via `getRoadmapsForProducts()`

### ProductTabs (`src/components/sales-flow/product-tabs.tsx`)
Renders product-specific content in a tabbed interface. If only one product is selected, renders directly without tabs. Shows product tagline under tab name.

### ContactsTable / ContactsKanban
Two views of the contact pipeline:
- **Table**: Filterable list with product avatars, step labels, progress indicators
- **Kanban**: Columns per sales step, drag-free visual pipeline

### ContactSheet (`src/components/contacts/contact-sheet.tsx`)
Slide-out panel for creating/editing contacts with full field access.

## Server Actions (`src/lib/actions/contacts.ts`)

| Action | Purpose |
|--------|---------|
| `getContacts()` | List all contacts for the current user |
| `getContact(id)` | Fetch a single contact by ID |
| `createContact(data)` | Create a new contact |
| `updateContact(id, data)` | Update contact fields |
| `deleteContact(id)` | Delete a contact |
| `toggleSampleSent(id, sent)` | Toggle sample sent flag |
| `updateContactOutcome(id, outcome)` | Set contact outcome |
| `updateContactStep(id, step)` | Set current step |

All actions use the server Supabase client and scope queries to the authenticated user's ID. Path revalidation is called for `/contacts` and `/sales`.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key (server-side only)
```

## Development

```bash
npm install
npm run dev          # Start dev server (default port 3000)
PORT=3001 npm run dev  # Start on custom port
npm run build        # Production build
npm run lint         # ESLint
```

## Navigation Structure

| Nav Item | Route | Purpose |
|----------|-------|---------|
| Start Conversation | `/sales` | Main entry — guided sales flow |
| Contacts | `/contacts` | Contact list + Kanban pipeline |
| Evidence | `/evidence` | Clinical studies |
| Practice | `/practice` | Objection flashcards |
| Favorites | `/favorites` | Saved scripts |
| Roadmaps | `/roadmaps` | Visual roadmap gallery |

Products are accessible at `/products` and `/products/[product]` but are not in the main navigation — they serve as reference pages only.

## Commit Convention

Before every commit, ensure README.md and cursor rules are up to date with any architectural or structural changes made in the session.
