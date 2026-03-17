# Post-Review Bugfix Plan — Simplified Sales Flow

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 7 issues found during end-to-end code review of the 6-step sales flow migration.

**Architecture:** All fixes are localized edits — no new components, no schema changes, no new dependencies. Three fixes target the server-side data layer (normalize legacy steps at read-time), three target the client-side Discovery component (persist "Other" text, accept `continueLabel`, merge product_ids), and one removes dead code.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase server actions, shadcn/ui

---

## Issue Inventory

| # | Severity | File(s) | Summary |
|---|----------|---------|---------|
| 1 | IMPORTANT | `decision-tree.tsx` | Discovery category overwrites all `product_ids` instead of merging |
| 2 | IMPORTANT | `reminders.ts` | Legacy step IDs cause `undefined` threshold → `NaN` math |
| 3 | IMPORTANT | `contacts.ts` (actions) | Legacy contacts not normalized at data layer → broken pipeline/kanban |
| 4 | MINOR | `step-discovery-v2.tsx` | "Other" text in tried-before never persisted to DB |
| 5 | MINOR | `step-discovery-v2.tsx`, `decision-tree.tsx` | `continueLabel` not passed to Discovery V2 (hard-coded string) |
| 6 | MINOR | `decision-tree.tsx` | Dead `toggleQuestion` callback + unused `TimestampedQuestion` import |
| 7 | MINOR | `contacts-table.tsx` | Hardcoded `stepLabels` map with legacy entries instead of deriving from `SALES_STEPS` |

---

### Task 1: Fix product_ids merge behavior in Discovery category selection

**Files:**
- Modify: `src/components/sales-flow/decision-tree.tsx:271-282`

**Problem:** When a user selects a discovery category, `setDiscoveryCategory` overwrites the entire `product_ids` array with `[cat.productId]`. If a contact already has products, they're silently dropped.

**Step 1: Locate the callback**

Find `setDiscoveryCategory` in `decision-tree.tsx` (around line 271).

**Step 2: Replace the callback body**

Change from:
```typescript
const setDiscoveryCategory = useCallback((key: string) => {
  setState(prev => ({ ...prev, discoveryCategory: key }));
  const cat = getCategoryByKey(key);
  if (cat && activeContact) {
    setActiveContact(prev => prev ? { ...prev, product_ids: [cat.productId] } : prev);
  }
}, [activeContact]);
```

To:
```typescript
const setDiscoveryCategory = useCallback((key: string) => {
  setState(prev => ({ ...prev, discoveryCategory: key }));
  const cat = getCategoryByKey(key);
  if (cat && activeContact) {
    setActiveContact(prev => {
      if (!prev) return prev;
      if (prev.product_ids.length === 0) return { ...prev, product_ids: [cat.productId] };
      const already = prev.product_ids.includes(cat.productId);
      return already ? prev : { ...prev, product_ids: [cat.productId, ...prev.product_ids] };
    });
  }
}, [activeContact]);
```

**Behavior:**
- Empty `product_ids` → sets to `[suggestedProduct]`
- Non-empty, already contains suggested → no change
- Non-empty, doesn't contain suggested → prepends suggested, preserves existing

**Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/sales-flow/decision-tree.tsx
git commit -m "fix: merge discovery product into product_ids instead of overwriting"
```

---

### Task 2: Add legacy step fallback in reminders

**Files:**
- Modify: `src/lib/actions/reminders.ts:6-7,68`

**Problem:** `getFollowUpReminders` reads `contact.current_step` directly. If a legacy contact has `current_step: "opening"`, `STALENESS_THRESHOLDS["opening"]` is `undefined`. Downstream math (`threshold - 1`) produces `NaN`, creating phantom reminders with garbage dates.

**Step 1: Add the import**

```typescript
import { normalizeContactStep } from "@/lib/db/types";
```

**Step 2: Normalize the step before use**

Change line 68 from:
```typescript
const step = contact.current_step;
```
To:
```typescript
const step = normalizeContactStep(contact.current_step);
```

This maps `opening→discovery`, `presentation→samples`, `closing→close`, `objections→close` before any threshold lookup.

**Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/lib/actions/reminders.ts
git commit -m "fix: normalize legacy steps in reminder computation to prevent NaN thresholds"
```

---

### Task 3: Normalize legacy steps at the data read layer

**Files:**
- Modify: `src/lib/actions/contacts.ts:5-6,13-29,228`

**Problem:** `normalizeContactStep` only runs inside `decision-tree.tsx`. Every other consumer (`contacts-table`, `kanban-card`, `dashboard`, `reminders`) receives raw legacy step IDs from the DB, causing broken pipeline counts, invisible kanban cards, and raw strings in the UI.

**Step 1: Add the import**

Add to `src/lib/actions/contacts.ts`:
```typescript
import { normalizeContactStep } from "@/lib/db/types";
```

**Step 2: Normalize in `getContacts()`**

Replace the return statement:
```typescript
// Before
return { data: data as Contact[] | null, error: error?.message || null };

// After
const normalized = (data as Contact[] | null)?.map(c => ({
  ...c,
  current_step: normalizeContactStep(c.current_step),
})) ?? null;
return { data: normalized, error: error?.message || null };
```

**Step 3: Normalize in `getContact()`**

Replace the return statement:
```typescript
// Before
return { data: data as Contact | null, error: error?.message || null };

// After
const contact = data
  ? { ...data, current_step: normalizeContactStep((data as Contact).current_step) } as Contact
  : null;
return { data: contact, error: error?.message || null };
```

**Step 4: Normalize in `getDashboardStats()`**

Replace:
```typescript
const all = (contacts as Contact[]) || [];
```
With:
```typescript
const all = ((contacts as Contact[]) || []).map(c => ({
  ...c,
  current_step: normalizeContactStep(c.current_step),
}));
```

**Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/lib/actions/contacts.ts
git commit -m "fix: normalize legacy contact steps at data layer for all consumers"
```

---

### Task 4: Persist "Other" text in discovery tried-before

**Files:**
- Modify: `src/components/sales-flow/step-discovery-v2.tsx:66-100,263-270`

**Problem:** When the user checks "Other" and types custom text, `otherText` lives in local `useState` only. It's never passed to the parent, never saved to the DB, and lost on unmount.

**Step 1: Initialize `otherText` from existing data**

Replace:
```typescript
const [otherText, setOtherText] = useState("");
```
With:
```typescript
const existingOther = discoveryTriedBefore.find((i) => i.startsWith("Other: "));
const [otherText, setOtherText] = useState(
  existingOther ? existingOther.replace("Other: ", "") : ""
);
```

**Step 2: Add `isOtherChecked` derived state**

After the script variables, add:
```typescript
const isOtherChecked =
  discoveryTriedBefore.includes("Other") ||
  discoveryTriedBefore.some((i) => i.startsWith("Other: "));
```

**Step 3: Update `toggleTriedBefore` to handle "Other" specially**

Replace:
```typescript
const toggleTriedBefore = (item: string) => {
  const next = discoveryTriedBefore.includes(item)
    ? discoveryTriedBefore.filter((i) => i !== item)
    : [...discoveryTriedBefore, item];
  onTriedBeforeChange(next);
};
```
With:
```typescript
const toggleTriedBefore = (item: string) => {
  if (item === "Other") {
    if (isOtherChecked) {
      onTriedBeforeChange(
        discoveryTriedBefore.filter((i) => i !== "Other" && !i.startsWith("Other: "))
      );
      setOtherText("");
    } else {
      onTriedBeforeChange([...discoveryTriedBefore, "Other"]);
    }
    return;
  }
  const next = discoveryTriedBefore.includes(item)
    ? discoveryTriedBefore.filter((i) => i !== item)
    : [...discoveryTriedBefore, item];
  onTriedBeforeChange(next);
};
```

**Step 4: Use `isOtherChecked` in checkbox rendering**

In the TRIED_BEFORE_OPTIONS `.map()`, change:
```typescript
const checked = discoveryTriedBefore.includes(item);
```
To:
```typescript
const checked = item === "Other" ? isOtherChecked : discoveryTriedBefore.includes(item);
```

**Step 5: Persist on blur**

Replace the "Other" `<Input>`:
```tsx
{isOtherChecked && (
  <Input
    value={otherText}
    onChange={(e) => setOtherText(e.target.value)}
    onBlur={() => {
      if (!otherText.trim()) return;
      const tag = `Other: ${otherText.trim()}`;
      const cleaned = discoveryTriedBefore.filter(
        (i) => i !== "Other" && !i.startsWith("Other: ")
      );
      onTriedBeforeChange([...cleaned, tag]);
    }}
    placeholder="What else have they tried?"
    className="mt-2"
  />
)}
```

**Data format:** When the user types "Acupuncture" and blurs, the `discoveryTriedBefore` array changes from `["Doctor", "Other"]` to `["Doctor", "Other: Acupuncture"]`. This single entry persists through auto-save to the `discovery_tried_before text[]` column.

**Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 7: Commit**

```bash
git add src/components/sales-flow/step-discovery-v2.tsx
git commit -m "fix: persist 'Other' free-text in discovery tried-before array"
```

---

### Task 5: Pass `continueLabel` to StepDiscoveryV2

**Files:**
- Modify: `src/components/sales-flow/step-discovery-v2.tsx:39-40,65,311`
- Modify: `src/components/sales-flow/decision-tree.tsx` (renderStep discovery case)

**Problem:** Every step accepts a `continueLabel` prop for the dynamic "Continue to X" button text, except `StepDiscoveryV2`, which hard-codes "Continue to Send Samples". If the step order ever changes, this label breaks.

**Step 1: Add prop to interface**

In `StepDiscoveryV2Props`, add:
```typescript
continueLabel?: string;
```

**Step 2: Accept the prop**

In the destructured params, add `continueLabel`:
```typescript
export function StepDiscoveryV2({
  ...existing,
  onContinue,
  continueLabel,
}: StepDiscoveryV2Props) {
```

**Step 3: Use the prop in the button**

Replace:
```tsx
Continue to Send Samples
```
With:
```tsx
{continueLabel ?? "Continue to Send Samples"}
```

**Step 4: Pass prop from DecisionTree**

In `decision-tree.tsx`, in the `case "discovery":` block, add `continueLabel={continueLabel}` to `<StepDiscoveryV2>`.

**Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/components/sales-flow/step-discovery-v2.tsx src/components/sales-flow/decision-tree.tsx
git commit -m "fix: pass dynamic continueLabel to Discovery V2 step"
```

---

### Task 6: Remove dead `toggleQuestion` callback

**Files:**
- Modify: `src/components/sales-flow/decision-tree.tsx:13,271-285`

**Problem:** The `toggleQuestion` callback was used by the old `StepDiscovery` component for per-product question checkboxes. In the new 6-step flow, `StepDiscoveryV2` uses category selection and sliders instead. The callback is defined but never passed to any component — dead code. The `TimestampedQuestion` import is also unused.

**Step 1: Remove the callback**

Delete the entire `toggleQuestion` callback (the `useCallback` block that handles `questionsAsked[productId]`).

**Step 2: Remove unused import**

Change:
```typescript
import type { Contact, TimestampedQuestion, TimestampedObjection, QuestionsAsked, ObjectionsEncountered } from "@/lib/db/types";
```
To:
```typescript
import type { Contact, TimestampedObjection, QuestionsAsked, ObjectionsEncountered } from "@/lib/db/types";
```

**Note:** `QuestionsAsked` and `ObjectionsEncountered` are still used in `DecisionTreeState` and `buildSavePayload()` — only `TimestampedQuestion` is dead.

**Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/sales-flow/decision-tree.tsx
git commit -m "chore: remove dead toggleQuestion callback and unused import"
```

---

### Task 7: Derive contacts-table step labels from SALES_STEPS

**Files:**
- Modify: `src/components/contacts/contacts-table.tsx:21-44`

**Problem:** `contacts-table.tsx` has a hardcoded `stepLabels` map with 11 entries (6 new + 4 legacy + "closed"), while every other component (`dashboard`, `kanban`, `contact-sheet`) derives labels dynamically from `SALES_STEPS`. The legacy entries are now unnecessary since Task 3 normalizes at the data layer.

**Step 1: Add the import**

```typescript
import { SALES_STEPS } from "@/types/roadmap";
```

**Step 2: Replace the hardcoded map**

Change:
```typescript
const stepLabels: Record<string, string> = {
  add_contact: "Add Contact",
  discovery: "Discovery",
  samples: "Send Samples",
  followup: "Follow-Up",
  close: "Close",
  purchase_links: "Purchase Links",
  closed: "Closed",
  opening: "Opening",
  presentation: "Presentation",
  objections: "Objections",
  closing: "Closing",
};
```
To:
```typescript
const stepLabels: Record<string, string> = Object.fromEntries([
  ...SALES_STEPS.map(s => [s.id, s.label]),
  ["closed", "Closed"],
]);
```

**Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/contacts/contacts-table.tsx
git commit -m "refactor: derive contacts-table step labels from SALES_STEPS"
```

---

## Final Verification

After all 7 tasks:

```bash
npx tsc --noEmit      # 0 errors expected
npx next lint          # 0 new warnings expected
```

## Dependency Graph

Tasks 1-7 are fully independent. They can be executed in any order or in parallel. No task depends on another.

## Pre-Existing Issues (Out of Scope)

These were identified during review but are **not caused by the 6-step migration**. They should be addressed in a separate plan:

1. **Flush-on-unmount stale closure** — `decision-tree.tsx` line ~215: `useEffect` cleanup captures stale `state` and `currentStep` from initial render due to `[isDrawer]` dep array. Risk: data loss on drawer close.
2. **`stage_entered_at` reset on every auto-save** — `contacts.ts` always includes `current_step` in the save payload, triggering `stage_entered_at` update. Makes "time in stage" metrics meaningless.
