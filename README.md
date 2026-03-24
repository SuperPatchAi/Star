# SuperPatch S.T.A.R.

**Sample. Track. Align. Recruit.** — A Next.js 16 sales enablement app for SuperPatch direct-to-consumer reps. Guided 7-step sales conversations with multi-product support, contact tracking, auto-save, and product-specific scripts powered by roadmap spec data.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| UI | React 19, shadcn/ui (New York style), Tailwind CSS 4, @dnd-kit/react |
| Auth & DB | Supabase (Auth, PostgreSQL, RLS, Server Actions) |
| State | React useState/useCallback/useEffect (no external state library) |
| Deployment | Vercel (`star-seven-sigma.vercel.app`) |
| Repository | [github.com/SuperPatchAi/Star](https://github.com/SuperPatchAi/Star) |

## Architecture Overview

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Root redirect → /dashboard
│   ├── layout.tsx          # Root layout (fonts, metadata, Toaster, ThemeProvider)
│   ├── globals.css         # Tailwind + CSS variables + themes
│   ├── (auth)/             # Auth group (login, signup, callbacks)
│   ├── dashboard/          # Dashboard entry point
│   ├── contacts/           # Contact management (list + Kanban)
│   ├── activity/           # Follow-up reminders & activity feed
│   ├── products/           # Product catalog (reference only)
│   ├── evidence/           # Clinical evidence page
│   ├── practice/           # Objection flashcards
│   ├── roadmaps/           # Roadmap image gallery
│   ├── onboarding/         # New user onboarding flow (carousel, tour, checklist)
│   ├── settings/           # Settings page (profile, social links, notifications, appearance, account, about)
│   ├── card/[subdomain]/   # Public digital business card (no auth required)
│   ├── api/og/card/        # OG image generation for card social previews (edge runtime)
│   └── api/auth/           # Auth API routes (signout)
├── components/
│   ├── layout/             # AppShell, AppSidebar, BottomNav
│   ├── sales-flow/         # Decision tree + all step components
│   ├── contacts/           # Contact table, Kanban, sheet
│   ├── follow-ups/         # Notification bell, activity feed, feed entries
│   ├── onboarding/         # Onboarding components (carousel, tour, checklist)
│   ├── settings/           # Settings section components (profile, social links, notifications, appearance, account, about)
│   ├── card/               # Business card components (BusinessCardDisplay, ShareCardButton)
│   └── ui/                 # shadcn/ui primitives
├── lib/
│   ├── auth.ts             # Auth helpers (getAuthUser, requireAdmin)
│   ├── security.ts         # Redirect/input sanitization
│   ├── utils.ts            # cn(), copyToClipboard(), shareOrCopy(), getProductPurchaseUrl(), getSocialUrl(), buildSocialFooter()
│   ├── interpolate-script.ts # {{FirstName}}/[Name] replacement in scripts
│   ├── roadmap-data.ts     # Roadmap spec loading functions
│   ├── supabase/           # Supabase clients (server, client, middleware)
│   ├── actions/            # Server actions (contacts, reminders, activity, onboarding, profile, push subscriptions)
│   └── db/                 # Database TypeScript types
├── data/
│   ├── products.ts         # Product catalog (13 products)
│   ├── roadmap-specs-v2/   # 13 product-specific JSON roadmap specs
│   ├── roadmap-specs/      # Legacy v1 specs (unused by app)
│   └── wordtracks/         # D2C word track scripts per product
├── types/
│   ├── index.ts            # Product, WordTrack, NavItem types
│   ├── roadmap.ts          # RoadmapV2 types + SALES_STEPS constant
│   ├── activity.ts         # ActivityEvent, UnifiedFeedItem, TimeBucket, getTimeBucket
│   └── wordtrack.ts        # WordTrack section types
├── contexts/               # AuthContext provider
├── hooks/                  # useAuth, useIsMobile, useServiceWorker
└── proxy.ts                # Next.js middleware (auth guard)
```

## Sales Conversation Flow

The core feature is a 7-step guided sales conversation. Rapport-first approach builds trust before discovery, with quantifiable 1-10 ratings tracked through follow-up.

### Step Sequence

```
1. Add Contact      → Create contact with first/last name (no product selection)
2. Rapport          → Per-product personal story scripts (how the rep discovered the product), talking points, and transition bridge to discovery
3. Discovery        → 5 universal questions: category selection, quality rating (1-10), duration, what they've tried, results
4. Send Samples     → Auto-suggested product from discovery category, address collection
5. Follow-Up        → 7-day sequence with 1-10 rating at each touchpoint, category-contextual scripts
6. Close            → Closing techniques + collapsible objection handling (merged)
7. Purchase Links   → Share personalized product purchase URLs + Won/Lost outcome recording
```

### Data Flow Diagram

```
User lands on /contacts
        │
        ▼
┌─────────────────┐     ┌──────────────────┐
│  DecisionTree   │────▶│  StepAddContact   │  Step 0: Gate
│  (client state) │     │  Name/phone only  │
└────────┬────────┘     └──────────────────┘
         │                       │
         │  onContactCreated     │  createContact() server action
         │◀──────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 2: Rapport Building               │
│  Per-product personal story scripts     │
│  Read-only → bridges into Discovery     │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 3: Universal Discovery            │
│  Category → auto-maps to product        │
│  1-10 baseline rating recorded          │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Steps 4-7: Product-contextual content  │
│  Auto-save on every state change        │
│  (500ms debounce → updateContact())     │
│  Follow-up tracks 1-10 improvement      │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   Supabase      │
│   d2c_contacts  │
│   (PostgreSQL)  │
└─────────────────┘
```

### Product Auto-Suggestion

- Discovery category selection maps to a recommended product (e.g., "Pain Management" → Freedom)
- Rep can override or add more products at the Sample step
- Per-product state is still stored as JSONB for closing techniques and objections:
  - `closing_techniques: { "freedom": "ASSUMPTIVE" }`
  - `objections_encountered: { "freedom": [{ "objection": "TOO EXPENSIVE", "encountered_at": "..." }] }`

### Script Personalization

All sales scripts support **contact name interpolation** via `interpolateScript()` and **category-contextual interpolation** via `interpolateFollowUpTemplate()`. Discovery answers (category, baseline rating) are dynamically inserted into follow-up scripts at runtime.

### Resume Flow

Contacts can be resumed from:
- **Contacts page** → "Resume" button or row click → opens contact sheet (calls `onEdit`)
- **Kanban board** → card click or "Resume" button → opens contact sheet (calls `onEdit`)
- **Activity feed** → "Open Flow" / "Resume" links → `/contacts?openContact=xxx`

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
  sample_followup_done boolean not null default false,
  outcome         text default 'pending',
  follow_up_day   integer,
  discovery_category    text,
  discovery_quality_rating integer,
  discovery_duration    text,
  discovery_tried_before text[] default '{}',
  discovery_tried_result text,
  followup_ratings      jsonb default '{}'::jsonb,
  stage_entered_at timestamptz default now(),
  peak_step       text,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);
```

- **RLS**: All policies enforce `auth.uid() = user_id` (select, insert, update, delete)
- **Indexes**: `user_id`, `product_ids` (GIN), `outcome`, `current_step`, `(current_step, stage_entered_at)`

### `user_profiles` Table

Fields: `id`, `email`, `full_name`, `avatar_url`, `role` (admin/user), `is_active`, `invited_by`, `onboarding_step`, `onboarding_checklist` (JSONB), `store_subdomain` (MLM store subdomain for purchase URLs), `notification_preferences` (JSONB), `social_links` (JSONB — partial record of platform handles: instagram, facebook, tiktok, youtube, linkedin, x), `created_at`, `updated_at`. Auto-created on signup via the `handle_new_user()` trigger on `auth.users`.

### `d2c_activity_log` Table

Append-only event log for the unified activity feed. Fields: `id` (uuid), `user_id` (uuid), `contact_id` (uuid, nullable), `event_type` (text), `metadata` (jsonb), `created_at` (timestamptz). RLS scoped to `auth.uid() = user_id`. Indexed on `(user_id, created_at desc)`.

**Event types**: `contact_created`, `step_changed`, `sample_sent`, `sample_confirmed`, `followup_completed`, `outcome_changed`. Events are logged fire-and-forget from `createContact`, `updateContact`, and `advanceFollowUpDay` server actions.

### `d2c_push_subscriptions` Table

Stores web push subscriptions per user. Fields: `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`. RLS scoped to `auth.uid() = user_id`.

## Roadmap Spec Structure (V2)

Each product has a JSON file in `src/data/roadmap-specs-v2/` following the `RoadmapV2` TypeScript interface:

```
{
  metadata:   { product, category, tagline, benefits[], type, purpose, generated }
  sections:
    1_customer_profile:    { demographics[], pain_points[], psychographics[], tried_before[] }
    2_opening_approaches:  { approaches[]: { type, context, script } }  — 5 per product
    2b_rapport_story:      { personal_story, talking_points[], transition_to_discovery } — 1 per product
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
- `currentStepIndex` (0-6)
- `DecisionTreeState` (discovery answers, samples, follow-up ratings, closings, objections)
- `storeSubdomain` (user's MLM store subdomain, fetched on mount)
- `socialLinks` (user's social handles, fetched on mount, passed to purchase links and follow-up steps)
- Auto-save via `useEffect` with 500ms debounce
- Contact gating (step 0 must be completed before proceeding)
- Auto-maps discovery category to product_ids
- Legacy step normalization for existing contacts via `normalizeContactStep()`

### ProductTabs (`src/components/sales-flow/product-tabs.tsx`)
Renders product-specific content in a tabbed interface. If only one product is selected, renders directly without tabs. Shows product tagline under tab name.

### ContactsTable / ContactsKanban
Two views of the contact pipeline:
- **Table**: Filterable list with product avatars, step labels, progress indicators
- **Kanban**: Stage-based pipeline board with two responsive layouts:
  - **Desktop (md+)**: Drag-and-drop columns via `@dnd-kit/react` with droppable zones, drag overlay, and visual drop target highlighting
  - **Mobile (below md)**: Vertical accordion layout (Radix Accordion) with collapsible stage panels, eliminating horizontal scroll
  - **Quick actions on cards**: Stage advance/back chevrons, one-tap call/email, Won/Lost buttons (on closing/followup stages), and Resume link
  - **Staleness indicators**: Amber ring + day count on cards that exceed per-stage idle thresholds (from `STALENESS_THRESHOLDS`)
  - **Optimistic updates**: Stage changes (drag or button) update UI immediately, revert on server error, and manage `follow_up_day` lifecycle
  - **Skeleton loading**: Pulsing column/card skeletons on desktop, accordion row skeletons on mobile
  - **Column headers**: Stage number badges, contact count with pipeline fraction (e.g., "3/12")

### KanbanCard (`src/components/contacts/kanban-card.tsx`)
Shared card sub-component used by both mobile accordion and desktop DnD layouts. Renders product avatars, contact info, outcome badges, staleness indicators, quick stage navigation, call/email buttons, Win/Lost actions, and Resume link.

### ContactSheet (`src/components/contacts/contact-sheet.tsx`)
Full-width slide-out drawer that serves as the primary sales workspace:
- **View mode**: Stacked layout with contact INFO section at top (summary, read-only stage display, contact details) and the full interactive `DecisionTree` component below
- **New contact mode**: Opens `DecisionTree` at step 0 (`add_contact`) for creating a contact and immediately starting a sales conversation
- **Edit mode**: Full field editing form for contact data; manual Current Step and Outcome controls are collapsed behind an "Advanced" section to prevent accidental changes
- The drawer replaces the old `/sales` page -- all sales conversations now happen inside the contact drawer
- `DecisionTree` receives `variant="drawer"` which hides the page-level header, uses inline navigation buttons, and adds flush-on-unmount to prevent data loss when the drawer closes

### Dashboard (`src/app/dashboard/page.tsx`)
Landing page with sales pipeline overview:
- **Pipeline summary**: Stat cards (Active, Won, Lost, Win Rate) + per-stage progress bars with deep links to `/contacts?stage=`
- **Today's follow-ups**: Shows overdue and due-today reminders with compact `FeedEntry` components
- **Recent activity**: Last 10 contact updates with name, step, outcome, and relative timestamp; "View all" links to `/activity`
- **Sales analytics**: What's Working / Watch Out / Discovery Depth sections; empty state card shown for new reps
- **Performance stats**: Contacts this week, active conversations
- **Auto-refresh**: `visibilitychange` listener re-fetches data when the tab becomes visible again

### FollowUpCalendar (`src/components/follow-ups/follow-up-calendar.tsx`)
Premium mobile-first calendar on the Activity page:
- **Week strip** (default): 7-day horizontal row with navigation arrows
- **Expanded month**: Full 6-row (42-cell) grid with leading/trailing month days (faded), weekend column shading, and current-week highlight stripe
- **Reminder count badges**: Colored count badges per day (red = overdue, amber = due, muted = upcoming) replacing the old 1px dots
- **Today indicator**: Filled primary circle on today's number (iOS Calendar style), ring-2 on selected day
- **Today button**: Appears in header when navigated away from the current month
- **Safari-safe**: Uses `new Date(y,m,d)` constructors, `max-height` transitions, explicit `-webkit-tap-highlight-color` removal, 44px minimum touch targets
- **Reminder dot map**: Uses `dueDate` field from `FollowUpReminder` to place badges on correct calendar dates
- **Uniform 2-day idle reminders**: All `STALENESS_THRESHOLDS` set to 2 days — any step idle for 2+ days triggers a follow-up reminder
- Tapping a day filters the activity feed below

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
| `updateContactStep(id, step)` | Set current step (also sets `stage_entered_at` and tracks `peak_step`) |
| `advanceFollowUpDay(id)` | Advance to next follow-up sequence step |
| `dismissReminder(id)` | Reset `stage_entered_at` to snooze a reminder |
| `getFollowUpReminders()` | Compute all pending reminders for the user |
| `getFollowUpReminderCount()` | Count of pending reminders (for badge) |
| `logActivity(type, contactId, metadata)` | Append event to `d2c_activity_log` (fire-and-forget) |
| `getActivityLog(limit?)` | Query recent activity events for the user |
| `getUnifiedFeed()` | Merge reminders + activity events into a single sorted feed |
| `subscribePush(subscription)` | Save push notification subscription |
| `unsubscribePush(endpoint)` | Remove push notification subscription |

All actions use the server Supabase client and scope queries to the authenticated user's ID. Path revalidation is called for `/contacts` and `/dashboard`.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key (server-side only)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=    # VAPID public key for push subscriptions
VAPID_PRIVATE_KEY=               # VAPID private key for sending push (server-side only)
CRON_SECRET=                     # Secret for authenticating Vercel Cron requests
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
| Dashboard | `/dashboard` | Main entry |
| Contacts | `/contacts` | Contact list + Kanban pipeline (unified search) |
| Activities | `/activity` | Follow-up reminders & activity feed |
| Practice | `/practice` | Objection flashcards |
| Clinical Evidence | `/evidence` | Clinical studies |

Products are accessible at `/products` and `/products/[product]` but are not in the main navigation — they serve as reference pages only.

### Command Palette (`⌘K`)

The sidebar search button opens a `CommandDialog` (cmdk) that lets reps search contacts by name. Selecting a result navigates to `/contacts?openContact={id}`, opening that contact's drawer. Contacts are fetched on dialog open. The shortcut `⌘K` (or `Ctrl+K`) toggles the palette globally.

### Mobile Navigation

On mobile (below `md` breakpoint), the sidebar is replaced by a fixed bottom tab bar (`BottomNav`) with 4 tabs: **Dashboard**, **Contacts**, **Activity**, **Roadmaps**, and **More** (opens sidebar sheet). The sidebar hamburger trigger is hidden on mobile. The sales flow has a sticky Previous/Next footer above the bottom nav for step navigation.

## Design System (Pipedrive-Inspired)

The app follows a clean, monochromatic visual language inspired by Pipedrive CRM:

### Typography Hierarchy
- **Global font**: Inter (via `--font-sans: var(--font-inter)`)
- **Page titles**: `text-xl font-semibold tracking-tight`
- **List item names**: `text-base font-semibold` -- bold enough to scan quickly
- **Supporting text**: `text-sm text-muted-foreground`
- **Metadata**: `text-xs text-muted-foreground/70` -- lighter for tertiary info

### Visual Patterns
- **Flat list rows** with thin dividers (`.flat-list-row`) instead of bordered cards for list content
- **Right-aligned status indicators** on contact rows (outcome icon + stage label)
- **Filter pills** with counts instead of select dropdowns (contacts, practice pages)
- **Floating Action Button (FAB)** for primary create actions on mobile
- **Pipedrive-style text tabs** with underline active state for view switching
- **Strategic color**: Green for success/won, red for lost/destructive, primary for CTAs, gray for everything else
- **Status colors** defined as CSS variables: `--success`, `--warning`, `--urgency`
- **Strengthened borders** (`--border` and `--input` CSS variables tuned for higher contrast); full-opacity dividers on `.flat-list-row`
- **Border-radius**: `0.75rem` for a modern, slightly rounded appearance

### Component Patterns
- **Outcome indicators**: Colored circle icons (CheckCircle for won, XCircle for lost, Circle for pending) -- not text badges
- **Sample sent**: Small green dot next to name, not a badge
- **Stage labels**: Plain muted text, not colored badges
- **Product filter**: Popover with list buttons, triggered by a filter icon
- **Contact detail sheet**: View-first layout with summary, interactive stage navigator (chevrons advance/regress stages), Won/Lost buttons, tabbed content (INFO / SALES PROGRESS), active follow-up script with copy-to-clipboard, sticky mobile bottom action bar (Resume Flow, phone, email), and "Resume Flow" CTA. Edit mode via pencil icon toggle.
- **Activity feed entries**: Flat list rows with type icons (phone/email/clock), red overdue dates, plain text day labels, one-tap checkbox for marking items done -- no card wrappers or colored accent bars
- **Activity feed section headers**: Uppercase label with count (e.g., "OVERDUE 2") -- no parentheses
- **Sales flow steps**: All step components (discovery-v2, send-samples, follow-up, close, purchase-links) use flat div sections with border-b dividers instead of Card wrappers; Badge labels replaced with plain colored text or muted pills
- **Reference tabs view**: All Card/CardHeader/CardContent stripped; sections use flat divs with section headers; Badge labels replaced with plain text spans
- **Pipeline direction indicators**: Green TrendingUp arrow on kanban cards when stage_entered_at is within 24h (recently advanced); red TrendingDown arrow when current_step is behind peak_step (regressed); amber AlertCircle for stale contacts
- **Resume flow**: DecisionTree shows a bordered contact header bar with back link to /contacts, product avatars, and bold name; step counter uses plain text instead of Badge; sales page heading shows "Resume: {name}" when resuming

## Mobile UX

The app includes a comprehensive mobile-first experience informed by HubSpot, Pipedrive, and Close CRM design patterns:

### Navigation and Layout
- **Bottom navigation bar** with 5 tabs (Sales, Contacts, Activity, Roadmaps, More) replaces the sidebar on mobile
- **Scrollable step pills** replace the 8-step indicator bar on small screens, with icons and auto-centering on the active step
- **Sticky Previous/Next footer** for easy step navigation without scrolling
- **Global overflow-x: hidden** on html and main container to prevent any page-level horizontal scrolling
- **Breadcrumb truncation** prevents long product names from overflowing the header

### Touch and Interaction
- **Always-visible copy buttons** on touch devices (desktop retains hover-to-reveal pattern via `md:opacity-0 md:group-hover:opacity-100`)
- **44px minimum tap targets** for all interactive elements across all pages
- **One-tap call/email** on contact cards using `tel:` and `mailto:` links (CRM pattern from HubSpot/Close)
- **Mobile quick-action bar** on contact list cards: phone, email, and resume buttons visible without menus
- **Touch-accessible roadmap overlays** with gradient bar at bottom instead of hover-only full overlay
- **Safe area insets** for notched devices (`env(safe-area-inset-*)`)
- **Pinch-to-zoom** enabled (viewport `maximumScale: 5`) for accessibility

### Responsive Layouts
- **Responsive form layouts** that stack to single columns on small screens (contact fields, address forms, contact sheet)
- **Responsive filters** on contacts page: full-width search + 3-column filter row on mobile
- **Stacked action buttons** on product detail, contacts page header
- **Wrapped key stats** on evidence page for narrow viewports
- **Responsive flashcard controls** with grid layout on mobile

### CRM-Inspired Polish
- **Compact mobile contact cards** hide secondary metadata (notes, address, progress badges) on mobile, showing only essentials
- **Better empty states** with icons, descriptive text, and CTAs (not just "No contacts found")
- **Contact sheet quick-action header** with call/email buttons when editing an existing contact
- **Kanban scroll indicator** with gradient fade on the right edge to signal horizontal scrollability
- **Product tabs** with scroll snap and touch-friendly sizing
- **Top-center toaster** position to avoid overlap with bottom nav

## New User Onboarding

A three-phase onboarding system that walks new reps through the app on first login.

### Phase 1: Feature Carousel (`/onboarding`)
- 8 full-screen swipeable slides showcasing key features (guided conversations, store link setup, pipeline, follow-ups, product scripts, objections, closing, install app)
- Slide 2 captures the user's Super Patch store subdomain (e.g., `yourname.superpatch.com`) for generating personalized purchase links
- Mobile-first with CSS scroll-snap, keyboard arrows on desktop
- Skip option available; middleware redirects new users here automatically
- Final slide encourages PWA installation

### Phase 2: Interactive Tour (Dashboard)
- 4-step tooltip tour highlighting key UI elements (Contacts nav, New Contact button, notification bell, Roadmaps nav)
- Custom spotlight overlay with positioned tooltips — no external library
- Auto-triggers when user reaches the `tour` onboarding phase

### Phase 3: Getting Started Checklist (Dashboard Widget)
- 5 milestones auto-detected from real user actions: add first contact, start first conversation, complete a sales step, send first sample, set up a follow-up
- Progress bar, celebration animation on completion, dismissible at any time
- Hooks into existing `createContact` and `updateContact` server actions

### Replay
Users can replay the carousel or tour anytime from the user dropdown menu in the sidebar footer.

### Database Columns
- `user_profiles.onboarding_step`: `carousel | tour | checklist | completed`
- `user_profiles.onboarding_checklist`: JSONB with 5 boolean milestone flags
- `user_profiles.store_subdomain`: text, user's MLM store subdomain (e.g., `"janesmith"` for `janesmith.superpatch.com`)
- `user_profiles.social_links`: JSONB, partial map of social platform handles (instagram, facebook, tiktok, youtube, linkedin, x)

### Public Digital Business Card (`/card/[subdomain]`)
- Public route (no auth required, bypasses middleware auth guard and onboarding redirect)
- Displays rep's avatar, name, "Visit My Store" link, and social media icons
- Social icons link to full profile URLs using platform-specific prefixes
- **Product variant** (`?products=freedom,rem`): When the `products` search param is present, the card shows a branded product grid with per-product purchase links instead of the generic store button. Used when sharing from the Purchase Links step in the sales flow.
- **OG image endpoint** (`/api/og/card/[subdomain]`) generates a 1200x630 PNG preview using `next/og` (edge runtime, Satori engine) for rich social media previews. Supports optional `?products=` param to render product recommendations in the OG image.
- **Share Card button** on the card page captures the card DOM as a PNG via `html-to-image`, then shares via Web Share API (native share sheet on iOS/Android) or downloads as a file. When sharing from the sales flow, includes the product card URL + personalized text alongside the image.
- Shareable from Settings → Profile section via the "My Links Card" widget

---

## Follow-Up Reminders and Activity Feed

A two-phase notification system that reminds reps to follow up with contacts at every stage of the sales pipeline.

### Phase 1: Unified Activity Feed
- **Bell icon** in the app-shell header with badge count of pending reminders (actionable items)
- **Unified feed** opens as a right-side Sheet merging follow-up reminders and activity log events into a single chronological stream
- **Time-based grouping**: Items are bucketed into Today, This Week, and Older sections with filter pills
- **Activity event types**: contact created, step changed, samples sent/confirmed, follow-up completed, outcome changed (won/lost/follow_up)
- **Activity events** are logged to `d2c_activity_log` table fire-and-forget from server actions
- **Staleness alerts** for contacts idle too long in any kanban stage (configurable thresholds per step)
- **Follow-up sequence reminders** based on the roadmap DAY 1/3/7/14 timeline
- **Feed entry cards** with one-tap call/email, copy script, and Mark Done/Snooze actions
- **Activity event cards** with type-specific icons, contact name, description, relative timestamp, and tap-to-open contact link
- **Script quick-view** expands inline with copy button (same pattern as `step-followup.tsx`)
- `stage_entered_at` column tracks when a contact entered their current step
- `peak_step` column tracks the highest step a contact has reached (for regression detection)
- `follow_up_day` column tracks progress through the follow-up sequence

### Phase 2: Push Notifications
- **Service worker** (`public/sw.js`) handles push events and notification click deep-linking
- **Push subscription** table (`d2c_push_subscriptions`) with RLS policies
- **Permission banner** shown on both dashboard and activity feed (non-blocking, dismissable)
- **Vercel Cron** (`vercel.json`) triggers daily at 12:00 UTC (8 AM ET)
- **Next.js API route** (`src/app/api/cron/send-reminders/route.ts`) processes reminders and sends push via `web-push` library with proper VAPID auth
- Expired push subscriptions (410/404) are automatically cleaned up

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/actions/reminders.ts` | `getFollowUpReminders()` server action |
| `src/types/reminders.ts` | Types + staleness thresholds + DAY offsets |
| `src/lib/actions/activity.ts` | `logActivity()`, `getActivityLog()`, `getUnifiedFeed()` server actions |
| `src/types/activity.ts` | `ActivityEvent`, `UnifiedFeedItem`, `TimeBucket` types + `getTimeBucket()` |
| `src/components/follow-ups/notification-bell.tsx` | Bell icon + badge + Sheet trigger |
| `src/components/follow-ups/activity-feed.tsx` | Unified feed list with time-based sections and filter pills |
| `src/components/follow-ups/activity-event-entry.tsx` | Activity event card with type icon, description, relative time |
| `src/components/follow-ups/feed-entry.tsx` | Reminder card with quick actions + script accordion |
| `src/components/follow-ups/push-permission-banner.tsx` | Non-blocking push permission prompt |
| `src/hooks/use-service-worker.ts` | Service worker registration hook |
| `src/lib/actions/push-subscriptions.ts` | Push subscription server actions |
| `src/app/api/cron/send-reminders/route.ts` | Cron-triggered API route for sending push notifications |
| `public/sw.js` | Service worker for push events |
| `vercel.json` | Vercel Cron schedule (daily at 12:00 UTC) |

## Progressive Web App (PWA)

The app is installable as a PWA on both Android and iOS devices.

### Install Experience
- **Chrome/Edge**: `beforeinstallprompt` event triggers a bottom banner with an "Install" button
- **iOS Safari**: Banner shows instructions to tap Share > "Add to Home Screen"
- **Onboarding gate**: The install prompt only appears **after** the onboarding tour is completed (checks `onboardingStep` prop for `checklist` or `completed`)
- **Onboarding slide**: The final carousel slide also encourages new users to install the app
- **Dismissal**: Banner hides for 7 days after dismissal (stored in localStorage)
- **Auto-hide**: Banner does not show if the app is already installed (standalone mode)

### Manifest & Icons
- `public/manifest.json` — PWA manifest (`SuperPatch S.T.A.R.`) with `display: standalone`, `start_url: /dashboard`
- `public/favicon.ico` — Browser tab favicon (SuperPatch logo, white on black)
- `public/favicon-16x16.png` / `public/favicon-32x32.png` — PNG favicons
- `public/icon-192x192.png` — Home screen icon (192x192)
- `public/icon-512x512.png` — Splash screen icon (512x512, also maskable)
- `public/apple-touch-icon.png` — iOS home screen icon (180x180)

### Key Files
| File | Purpose |
|------|---------|
| `src/components/pwa/install-prompt.tsx` | PWA install banner (Chrome + iOS) |
| `public/manifest.json` | PWA web app manifest |
| `public/sw.js` | Service worker (push + install) |

## Share / Copy-to-Clipboard

Every user-facing script and speakable text has a share-or-copy button powered by the **Web Share API**. On share-capable devices (iOS Safari, Android Chrome, desktop Chrome/Safari), tapping the button opens the native OS share sheet so reps can send scripts directly to SMS, Instagram, Facebook Messenger, WhatsApp, email, or any installed app. On browsers that don't support `navigator.share`, the button falls back to clipboard copy. Visual feedback (checkmark for 2 seconds) is shown after sharing or copying.

### Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Utility | `src/lib/utils.ts` | `shareOrCopy(text, title?)` — tries `navigator.share`, falls back to `copyToClipboard`; `getProductPurchaseUrl(subdomain, productId)` — generates MLM purchase URLs; `getSocialUrl(platform, handle)` — builds full social profile URL; `buildSocialFooter(links)` — generates social footer appended to shareable scripts |
| Component | `src/components/ui/share-copy-button.tsx` | `ShareCopyButton` — reusable button with icon swap (Share2/Copy/Check), SSR-safe share detection, `"icon"` and `"labeled"` variants |

### Usage across components

| Component | What's Shareable |
|-----------|-----------------|
| `step-rapport.tsx` | Rapport building personal story scripts |
| `step-discovery-v2.tsx` | Discovery questions and category selection |
| `step-send-samples.tsx` | Sample offer, commitment, and experience scripts |
| `step-followup.tsx` | Each follow-up template (with social footer) |
| `step-close.tsx` | Closing techniques + objection responses |
| `step-purchase-links.tsx` | Branded product business card (image + URL) as primary share, text scripts as secondary (with social footer) |
| `reference-tabs-view.tsx` | All scripts across Discovery, Samples, Follow-Up, Close, and Quick Ref tabs |
| `feed-entry.tsx` | Follow-up script templates in activity feed |
| `contact-sheet.tsx` | Active follow-up script on contact detail |

On mobile, share/copy buttons are always visible; on desktop they appear on hover (`md:opacity-0 md:group-hover:opacity-100`).

## Safari / iOS Compatibility

The app targets **Safari 15.4+** (desktop) and **iOS 16.4+** (for Web Push). Key hardening applied:

- **Autoprefixer** added to PostCSS — emits `-webkit-backdrop-filter` for all `backdrop-blur` usage
- **PWA install prompt** detects all iOS browsers (Chrome, Firefox, Edge) and iPadOS desktop mode, not just Safari
- **PushManager guard** — push permission banner only shows on browsers that actually support Web Push
- **No iOS auto-zoom** — all `<Input>` and `<Textarea>` components use `text-base` (16px) at every breakpoint
- **`type="tel"`** on all phone inputs for correct iOS keyboard
- **`autoComplete`** attributes on all auth forms, address forms, and subdomain inputs
- **Viewport unit fallbacks** — all `h-dvh` / `min-h-dvh` usage includes `100vh` fallback for older Safari
- **`touch-action: manipulation`** on all interactive elements to eliminate 300ms tap delay
- **Keyboard-aware fixed footer** — `DecisionTree` page-variant hides the fixed bottom nav when the iOS keyboard is open (via `visualViewport` API)
- **`localStorage` try/catch** — install prompt and push banner handle Safari private browsing gracefully
- **`.scrollbar-hide`** CSS utility alias matches both Tailwind naming conventions
- **Explicit Apple meta tags** — `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` in `<head>`
- **180x180 icon** in `manifest.json` for Apple touch icon requirements

### Minimum Safari version rationale

`oklch()` colors, `dvh` units, and `:has()` selectors all require Safari 15.4+. Container queries require 16+. `text-wrap: balance` requires 17.5+ but degrades gracefully. These establish 15.4 as the effective floor.

## Commit Convention

Before every commit, ensure README.md and cursor rules are up to date with any architectural or structural changes made in the session.
