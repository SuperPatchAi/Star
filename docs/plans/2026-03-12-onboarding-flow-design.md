# User Onboarding Flow — Design Document

**Date:** 2026-03-12  
**Status:** Approved

## Goal

Build a three-phase onboarding system that walks new SuperPatch D2C reps through the app on first login: a feature carousel, an interactive UI tour, and a persistent getting-started checklist.

## Architecture

Phased system with a dedicated `/onboarding` route for the carousel, live tooltip-based tour on the dashboard, and a dashboard widget for the checklist. State is persisted in `user_profiles` so progress survives sessions. Middleware enforces routing based on onboarding phase. Replayable from the user dropdown menu.

## Phases

### Phase 1: Feature Carousel (`/onboarding`)

Full-page, mobile-first swipeable screens showcasing SuperPatch features. Runs automatically on first login. Middleware redirects users with `onboarding_step = 'carousel'` here.

**6 slides:**

| # | Headline | Feature |
|---|----------|---------|
| 1 | Your guided sales conversations | 8-step scripted sales flow |
| 2 | Track every contact in your pipeline | Contact management + Kanban |
| 3 | Never miss a follow-up | Follow-up reminders + notifications |
| 4 | Scripts for every product | 13 product roadmaps with P-A-S scripts |
| 5 | Handle any objection | Objection handling with word tracks |
| 6 | Close more deals | Closing techniques + sample sending |

- CSS scroll-snap horizontal, touch swipeable
- Dot indicators, Next/Get Started button, Skip link
- Each slide: gradient background, large Lucide icon, headline, subtitle
- No AppShell (standalone layout)

### Phase 2: Interactive Tour (Dashboard Tooltips)

After carousel, user lands on dashboard. A lightweight custom tour (no external lib) highlights 4 key UI elements using a spotlight overlay + positioned tooltip.

**4 stops:**

| # | Target | Message |
|---|--------|---------|
| 1 | Sidebar "Contacts" nav | Your contacts and pipeline live here |
| 2 | "New Contact" button | Add your first contact to start a guided conversation |
| 3 | Notification bell | Follow-up reminders appear here |
| 4 | Sidebar "Roadmaps" nav | Browse product scripts anytime |

- Elements targeted via `data-tour-step` attributes
- Spotlight: CSS box-shadow overlay with transparent cutout
- Tooltip: positioned popover with message + Next/Back/Skip
- On complete/skip: advances to `checklist` phase

### Phase 3: Getting Started Checklist (Dashboard Widget)

Persistent card at top of dashboard tracking 5 milestones. Auto-detected by hooking into existing server actions.

**5 items:**

| # | Item | Trigger |
|---|------|---------|
| 1 | Add your first contact | `createContact` fires |
| 2 | Start your first conversation | Contact moves past `add_contact` step |
| 3 | Complete a sales step | Contact reaches `presentation` or beyond |
| 4 | Send your first sample | `sample_sent` becomes true |
| 5 | Set up a follow-up | `follow_up_day` gets set |

- Progress bar: "2 of 5 completed"
- Celebration animation when all complete
- Dismissible at any time

## Data Model

### `user_profiles` additions

```sql
ALTER TABLE user_profiles
  ADD COLUMN onboarding_step text NOT NULL DEFAULT 'carousel'
    CHECK (onboarding_step IN ('carousel', 'tour', 'checklist', 'completed')),
  ADD COLUMN onboarding_checklist jsonb NOT NULL DEFAULT '{
    "add_first_contact": false,
    "start_first_conversation": false,
    "complete_sales_step": false,
    "send_first_sample": false,
    "setup_followup": false
  }'::jsonb;
```

**Migration for existing users:** Set `onboarding_step = 'completed'` so they bypass onboarding.

### Server Actions (`src/lib/actions/onboarding.ts`)

- `getOnboardingState()` — returns `{ step, checklist }`
- `completeCarousel()` — advances to `tour`
- `completeTour()` — advances to `checklist`
- `updateChecklistItem(item)` — marks item true, auto-completes if all done
- `resetOnboarding(phase)` — for replay

## Routing

### Middleware changes

- If `onboarding_step === 'carousel'` and not on `/onboarding` → redirect to `/onboarding`
- If `onboarding_step !== 'carousel'` and on `/onboarding` → redirect to `/dashboard`

### Replay

User dropdown menu gets two new items:
- "Replay Feature Tour" → `resetOnboarding('tour')` → dashboard
- "Replay Welcome" → `resetOnboarding('carousel')` → `/onboarding`

## New Files

```
src/app/onboarding/page.tsx
src/app/onboarding/layout.tsx
src/components/onboarding/onboarding-carousel.tsx
src/components/onboarding/carousel-slide.tsx
src/components/onboarding/carousel-dots.tsx
src/components/onboarding/tour-provider.tsx
src/components/onboarding/tour-spotlight.tsx
src/components/onboarding/tour-tooltip.tsx
src/components/onboarding/getting-started-checklist.tsx
src/components/onboarding/checklist-item.tsx
src/components/onboarding/checklist-celebration.tsx
src/lib/actions/onboarding.ts
```

## Modified Files

- `src/lib/db/types.ts` — onboarding fields on `user_profiles`
- `src/lib/supabase/middleware.ts` — onboarding redirect logic
- `src/app/dashboard/page.tsx` — render checklist widget + tour provider
- `src/components/layout/app-shell.tsx` — `data-tour-step` attributes + tour provider wrapper
- `src/components/layout/app-sidebar.tsx` — `data-tour-step` attributes + replay menu items
- `src/lib/actions/contacts.ts` — hook checklist auto-detection into mutations
- `supabase/migrations/` — new migration for columns

## Design Inspiration

Pipedrive mobile onboarding (feature carousel with phone mockups and headlines per feature area).
