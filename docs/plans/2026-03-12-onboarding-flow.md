# Onboarding Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a three-phase user onboarding system (feature carousel, interactive tour, getting-started checklist) that activates on first login and is replayable from settings.

**Architecture:** Dedicated `/onboarding` route for the carousel (outside AppShell), tooltip-based tour on the live dashboard, persistent checklist widget on the dashboard. State persisted in `user_profiles` with middleware-enforced routing.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, shadcn/ui, Tailwind CSS 4, Supabase (PostgreSQL + RLS), Server Actions

---

## Task 1: Database Migration — Add Onboarding Columns

**Files:**
- Create: `supabase/migrations/20260312_add_onboarding_columns.sql`
- Modify: `src/lib/db/types.ts:11-43`

**Step 1: Write the migration SQL**

Create `supabase/migrations/20260312_add_onboarding_columns.sql`:

```sql
-- Add onboarding tracking columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step text NOT NULL DEFAULT 'carousel'
    CHECK (onboarding_step IN ('carousel', 'tour', 'checklist', 'completed')),
  ADD COLUMN IF NOT EXISTS onboarding_checklist jsonb NOT NULL DEFAULT '{
    "add_first_contact": false,
    "start_first_conversation": false,
    "complete_sales_step": false,
    "send_first_sample": false,
    "setup_followup": false
  }'::jsonb;

-- Mark all existing users as completed so they skip onboarding
UPDATE user_profiles SET onboarding_step = 'completed';
```

**Step 2: Update TypeScript types**

In `src/lib/db/types.ts`, add to the `user_profiles` Row type (after `updated_at: string;`):

```typescript
onboarding_step: 'carousel' | 'tour' | 'checklist' | 'completed';
onboarding_checklist: {
  add_first_contact: boolean;
  start_first_conversation: boolean;
  complete_sales_step: boolean;
  send_first_sample: boolean;
  setup_followup: boolean;
};
```

Add matching optional fields to Insert and Update types.

Also export the checklist type for reuse:

```typescript
export type OnboardingStep = 'carousel' | 'tour' | 'checklist' | 'completed';
export type OnboardingChecklist = {
  add_first_contact: boolean;
  start_first_conversation: boolean;
  complete_sales_step: boolean;
  send_first_sample: boolean;
  setup_followup: boolean;
};
```

**Step 3: Run the migration**

Run: `npx supabase db push` (or apply via Supabase dashboard)

**Step 4: Commit**

```bash
git add supabase/migrations/20260312_add_onboarding_columns.sql src/lib/db/types.ts
git commit -m "feat(onboarding): add onboarding_step and onboarding_checklist columns to user_profiles"
```

---

## Task 2: Server Actions — Onboarding CRUD

**Files:**
- Create: `src/lib/actions/onboarding.ts`

**Step 1: Create the onboarding server actions file**

Create `src/lib/actions/onboarding.ts` with these server actions:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { OnboardingStep, OnboardingChecklist } from "@/lib/db/types";

type SupabaseAny = any;

export interface OnboardingState {
  step: OnboardingStep;
  checklist: OnboardingChecklist;
}

const DEFAULT_CHECKLIST: OnboardingChecklist = {
  add_first_contact: false,
  start_first_conversation: false,
  complete_sales_step: false,
  send_first_sample: false,
  setup_followup: false,
};

export async function getOnboardingState(): Promise<OnboardingState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { step: "completed", checklist: DEFAULT_CHECKLIST };

  const adminClient = await createAdminClient();
  const { data: profile } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .select("onboarding_step, onboarding_checklist")
    .eq("id", user.id)
    .single();

  return {
    step: (profile?.onboarding_step as OnboardingStep) ?? "completed",
    checklist: (profile?.onboarding_checklist as OnboardingChecklist) ?? DEFAULT_CHECKLIST,
  };
}

export async function completeCarousel(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = await createAdminClient();
  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({ onboarding_step: "tour", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  return { error: error?.message || null };
}

export async function completeTour(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = await createAdminClient();
  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({ onboarding_step: "checklist", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  return { error: error?.message || null };
}

export async function updateChecklistItem(
  item: keyof OnboardingChecklist
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = await createAdminClient();
  const { data: profile } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .select("onboarding_step, onboarding_checklist")
    .eq("id", user.id)
    .single();

  if (!profile || profile.onboarding_step === "completed") {
    return { error: null };
  }

  const checklist: OnboardingChecklist = profile.onboarding_checklist ?? DEFAULT_CHECKLIST;
  if (checklist[item]) return { error: null }; // already done

  checklist[item] = true;

  const allDone = Object.values(checklist).every(Boolean);
  const updates: Record<string, unknown> = {
    onboarding_checklist: checklist,
    updated_at: new Date().toISOString(),
  };
  if (allDone) {
    updates.onboarding_step = "completed";
  }

  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update(updates)
    .eq("id", user.id);

  revalidatePath("/dashboard");
  return { error: error?.message || null };
}

export async function resetOnboarding(
  phase: "carousel" | "tour" | "all"
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = await createAdminClient();
  const step: OnboardingStep = phase === "all" ? "carousel" : phase;

  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({ onboarding_step: step, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  return { error: error?.message || null };
}

export async function dismissOnboarding(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = await createAdminClient();
  const { error } = await (adminClient as SupabaseAny)
    .from("user_profiles")
    .update({ onboarding_step: "completed", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  return { error: error?.message || null };
}
```

**Step 2: Commit**

```bash
git add src/lib/actions/onboarding.ts
git commit -m "feat(onboarding): add server actions for onboarding state management"
```

---

## Task 3: Middleware — Onboarding Redirect Logic

**Files:**
- Modify: `src/lib/supabase/middleware.ts:55-83`

**Step 1: Add onboarding redirect logic**

After the existing authenticated-user redirect (line 79-83), and before the final `return supabaseResponse`, add:

```typescript
// Onboarding routing for authenticated users
if (user && !request.nextUrl.pathname.startsWith('/_next') && !request.nextUrl.pathname.startsWith('/api')) {
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding');

  // Fetch onboarding step from profile (lightweight query)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_step')
    .eq('id', user.id)
    .single();

  const onboardingStep = profile?.onboarding_step ?? 'completed';

  // Redirect new users to carousel
  if (onboardingStep === 'carousel' && !isOnboardingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    return NextResponse.redirect(url);
  }

  // Redirect away from /onboarding if already past carousel
  if (onboardingStep !== 'carousel' && isOnboardingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
}
```

**Important:** This query runs on every request for authenticated users. The `user_profiles` table should have an index on `id` (primary key, already indexed). The query only selects `onboarding_step` to keep it lightweight.

**Step 2: Commit**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "feat(onboarding): add middleware redirect for carousel phase"
```

---

## Task 4: Feature Carousel — Route & Components

**Files:**
- Create: `src/app/onboarding/layout.tsx`
- Create: `src/app/onboarding/page.tsx`
- Create: `src/components/onboarding/onboarding-carousel.tsx`
- Create: `src/components/onboarding/carousel-slide.tsx`
- Create: `src/components/onboarding/carousel-dots.tsx`

**Step 1: Create the onboarding layout (no AppShell)**

`src/app/onboarding/layout.tsx`:

```typescript
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      {children}
    </div>
  );
}
```

**Step 2: Create the onboarding page (server component)**

`src/app/onboarding/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getOnboardingState } from "@/lib/actions/onboarding";
import { OnboardingCarousel } from "@/components/onboarding/onboarding-carousel";

export default async function OnboardingPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { step } = await getOnboardingState();
  if (step !== "carousel") redirect("/dashboard");

  return <OnboardingCarousel />;
}
```

**Step 3: Build the carousel slide component**

`src/components/onboarding/carousel-slide.tsx`:

A client component that renders one slide with:
- Full-viewport height panel
- Gradient background (unique color per slide)
- Large Lucide icon (centered)
- Headline text (bold, large)
- Subtitle text (muted)

Props: `{ icon: LucideIcon; headline: string; subtitle: string; gradient: string }`

**Step 4: Build the carousel dots component**

`src/components/onboarding/carousel-dots.tsx`:

- Row of dots, active dot highlighted
- Props: `{ total: number; current: number; onDotClick: (index: number) => void }`

**Step 5: Build the main carousel component**

`src/components/onboarding/onboarding-carousel.tsx`:

Client component with:
- Horizontal scroll container with `scroll-snap-type: x mandatory`
- Each child is `scroll-snap-align: start` + `w-full shrink-0`
- `IntersectionObserver` or `scrollend` event to track current slide
- "Skip" link (top-right) calls `completeCarousel()` server action then `router.push('/dashboard')`
- "Next" button advances scroll, last slide shows "Get Started" which calls `completeCarousel()` then navigates
- Keyboard: Left/Right arrow support
- 6 slides defined inline with the content from the design doc

**Step 6: Commit**

```bash
git add src/app/onboarding/ src/components/onboarding/
git commit -m "feat(onboarding): build feature carousel with 6 slides"
```

---

## Task 5: Interactive Tour — Provider & Components

**Files:**
- Create: `src/components/onboarding/tour-provider.tsx`
- Create: `src/components/onboarding/tour-spotlight.tsx`
- Create: `src/components/onboarding/tour-tooltip.tsx`
- Modify: `src/components/layout/app-shell.tsx` — wrap with TourProvider, add `data-tour-step` attributes
- Modify: `src/components/layout/app-sidebar.tsx` — add `data-tour-step` attributes to nav items
- Modify: `src/app/dashboard/page.tsx` — add `data-tour-step` to "New Contact" button

**Step 1: Create tour-provider.tsx**

Client component context provider:
- State: `{ isActive: boolean; currentStep: number; steps: TourStep[] }`
- `TourStep` type: `{ target: string; title: string; message: string; placement: 'top' | 'bottom' | 'left' | 'right' }`
- Methods: `startTour()`, `nextStep()`, `prevStep()`, `skipTour()`
- On mount: checks `onboarding_step` prop — if `'tour'`, auto-starts after a 500ms delay
- On complete/skip: calls `completeTour()` server action

4 tour steps defined:
1. `[data-tour-step="contacts-nav"]` — "Your contacts live here..."
2. `[data-tour-step="new-contact"]` — "Add your first contact..."
3. `[data-tour-step="notification-bell"]` — "Follow-up reminders..."
4. `[data-tour-step="roadmaps-nav"]` — "Browse product scripts..."

**Step 2: Create tour-spotlight.tsx**

- Full-screen fixed overlay (z-50)
- Uses CSS `box-shadow: 0 0 0 9999px rgba(0,0,0,0.5)` on a transparent element positioned over the target
- Target rect obtained via `getBoundingClientRect()` + `ResizeObserver`
- Smooth transition when moving between targets

**Step 3: Create tour-tooltip.tsx**

- Positioned relative to target element
- Uses `data-tour-step` selector to find target in DOM
- Shows: title, message, step counter ("1 of 4"), Next/Back/Skip buttons
- Arrow pointing to target element
- Repositions on window resize

**Step 4: Add `data-tour-step` attributes to existing components**

In `src/components/layout/app-sidebar.tsx`:
- Add `data-tour-step="contacts-nav"` to the "Start Conversation" `SidebarMenuButton` (line ~155)
- Add `data-tour-step="roadmaps-nav"` to the "Roadmaps" `SidebarMenuButton` (line ~169)

In `src/components/layout/app-shell.tsx`:
- Add `data-tour-step="notification-bell"` wrapper around `<NotificationBell />` (line ~102)
- Wrap children with `<TourProvider onboardingStep={...}>` (pass onboarding step from profile)

In `src/app/dashboard/page.tsx`:
- Add `data-tour-step="new-contact"` to the "New Contact" `<Button>` (line ~113)

**Step 5: Commit**

```bash
git add src/components/onboarding/tour-*.tsx src/components/layout/ src/app/dashboard/page.tsx
git commit -m "feat(onboarding): build interactive tour with 4 spotlight steps"
```

---

## Task 6: Getting Started Checklist — Dashboard Widget

**Files:**
- Create: `src/components/onboarding/getting-started-checklist.tsx`
- Create: `src/components/onboarding/checklist-item.tsx`
- Create: `src/components/onboarding/checklist-celebration.tsx`
- Modify: `src/app/dashboard/page.tsx` — render checklist above stat cards

**Step 1: Build checklist-item.tsx**

Props: `{ label: string; icon: LucideIcon; completed: boolean }`
- Row with icon, label, and a green checkmark or gray circle
- Completed items get a subtle green tint + strikethrough on label
- Uses shadcn `Badge` or simple div styling

**Step 2: Build checklist-celebration.tsx**

- Simple confetti-like animation using CSS keyframe animations (colored circles rising)
- "You're all set!" message
- Auto-dismisses after 3 seconds, calls `dismissOnboarding()`

**Step 3: Build getting-started-checklist.tsx**

Client component:
- Fetches onboarding state via `getOnboardingState()` on mount
- Shows only when `step === 'checklist'`
- Card layout with:
  - "Getting Started" title + "Dismiss" text button
  - Progress bar: completed count / 5
  - List of 5 `ChecklistItem` components
  - When all complete: trigger `ChecklistCelebration`
- Items mapped from the `OnboardingChecklist` type:
  - `add_first_contact` → "Add your first contact" (UserPlus icon)
  - `start_first_conversation` → "Start your first conversation" (MessageSquare icon)
  - `complete_sales_step` → "Complete a sales step" (CheckCircle icon)
  - `send_first_sample` → "Send your first sample" (Package icon)
  - `setup_followup` → "Set up a follow-up" (Calendar icon)

**Step 4: Integrate into dashboard**

In `src/app/dashboard/page.tsx`, add the `<GettingStartedChecklist />` component right after the header div and before the stat cards grid. It self-hides when `step !== 'checklist'`.

**Step 5: Commit**

```bash
git add src/components/onboarding/getting-started-*.tsx src/components/onboarding/checklist-*.tsx src/app/dashboard/page.tsx
git commit -m "feat(onboarding): build getting started checklist dashboard widget"
```

---

## Task 7: Hook Checklist Auto-Detection into Existing Actions

**Files:**
- Modify: `src/lib/actions/contacts.ts:39-56` (`createContact`)
- Modify: `src/lib/actions/contacts.ts:58-86` (`updateContact`)

**Step 1: Hook into createContact**

After the successful insert in `createContact` (line 50-53), add:

```typescript
if (!error) {
  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  // Auto-detect onboarding checklist item
  updateChecklistItem("add_first_contact").catch(() => {});
}
```

Import `updateChecklistItem` from `@/lib/actions/onboarding`.

**Step 2: Hook into updateContact**

After the successful update in `updateContact` (line 80-83), add checklist detection based on the update payload:

```typescript
if (!error && data) {
  revalidatePath("/contacts");
  revalidatePath("/dashboard");

  const contact = data as Contact;

  // Detect conversation start
  if (contact.current_step && contact.current_step !== "add_contact") {
    updateChecklistItem("start_first_conversation").catch(() => {});
  }

  // Detect sales step completion (presentation or beyond)
  const advancedSteps = ["presentation", "samples", "objections", "closing", "followup", "closed"];
  if (contact.current_step && advancedSteps.includes(contact.current_step)) {
    updateChecklistItem("complete_sales_step").catch(() => {});
  }

  // Detect sample sent
  if (contact.sample_sent) {
    updateChecklistItem("send_first_sample").catch(() => {});
  }

  // Detect follow-up setup
  if (contact.follow_up_day !== null && contact.follow_up_day !== undefined && contact.follow_up_day >= 0) {
    updateChecklistItem("setup_followup").catch(() => {});
  }
}
```

**Step 3: Commit**

```bash
git add src/lib/actions/contacts.ts
git commit -m "feat(onboarding): hook checklist auto-detection into contact mutations"
```

---

## Task 8: Replay from User Dropdown Menu

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx:301-310`

**Step 1: Add replay menu items**

In the dropdown menu content in `app-sidebar.tsx`, after the "Settings" menu item and before the sign-out separator, add:

```tsx
<DropdownMenuSeparator />
<DropdownMenuItem
  onClick={async () => {
    await resetOnboarding("carousel");
    window.location.href = "/onboarding";
  }}
  className="cursor-pointer"
>
  <RotateCcw className="mr-2 h-4 w-4" />
  Replay Welcome
</DropdownMenuItem>
<DropdownMenuItem
  onClick={async () => {
    await resetOnboarding("tour");
    window.location.href = "/dashboard";
  }}
  className="cursor-pointer"
>
  <HelpCircle className="mr-2 h-4 w-4" />
  Replay Tour
</DropdownMenuItem>
```

Import `resetOnboarding` from `@/lib/actions/onboarding` and `RotateCcw`, `HelpCircle` from `lucide-react`.

**Step 2: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat(onboarding): add replay options to user dropdown menu"
```

---

## Task 9: Pass Onboarding State Through AppShell

**Files:**
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/app/dashboard/layout.tsx` (or wherever AppShell is instantiated with profile)

**Step 1: Thread onboarding step through AppShell**

The `AppShell` already receives `profile` as a prop. Since we added `onboarding_step` to `UserProfile`, it will be available as `profile?.onboarding_step`.

Pass it to the `TourProvider` wrapper:

```tsx
<TourProvider onboardingStep={profile?.onboarding_step ?? 'completed'}>
  {/* existing AppShell content */}
</TourProvider>
```

The TourProvider only auto-triggers when `onboardingStep === 'tour'`.

**Step 2: Commit**

```bash
git add src/components/layout/app-shell.tsx
git commit -m "feat(onboarding): thread onboarding state through AppShell to TourProvider"
```

---

## Task 10: Final Integration Testing & Cleanup

**Step 1: Test the full flow manually**

1. Create a new test user via invite
2. Verify redirect to `/onboarding` on first login
3. Swipe through all 6 carousel slides
4. Verify redirect to dashboard with tour auto-starting
5. Complete tour (4 steps)
6. Verify checklist appears on dashboard
7. Create a contact → verify "Add your first contact" checks off
8. Advance the contact → verify "Start your first conversation" checks off
9. Continue through steps → verify remaining items auto-check
10. Verify celebration on completion
11. Test skip at each phase
12. Test replay from user dropdown

**Step 2: Test edge cases**

- Close browser mid-carousel, reopen → should resume at `/onboarding`
- Existing users → should see `completed`, no onboarding
- Mobile viewport → verify touch swipe works
- Desktop → verify keyboard nav works

**Step 3: Update README.md**

Add onboarding section to the README documenting:
- The three phases
- How to replay
- Database columns added

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(onboarding): complete three-phase onboarding flow"
```
