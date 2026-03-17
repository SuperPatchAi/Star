# Simplified Sales Flow Design

## Problem

The current 9-step sales flow is too complex for reps. Product selection upfront (before knowing the prospect's needs) is backwards. Opening Approach and Presentation steps add friction without enough value. The follow-up sequence is generic rather than tied to measurable outcomes.

## Solution

Reduce from 9 steps to 6. Move product selection to after discovery (auto-suggested from needs). Replace product-specific discovery with universal category-based questions. Add quantifiable 1-10 ratings throughout for before/after proof. Merge Closing + Objections into one step.

## New Flow (6 Steps)

| Step | ID | Label | Purpose |
|------|----|-------|---------|
| 1 | `add_contact` | Add Contact | Name, email, phone only. No product selection. |
| 2 | `discovery` | Discovery | 5 universal questions. Category selection auto-suggests product. |
| 3 | `samples` | Send Samples | Auto-suggested product pre-selected, rep can override/add. Address. |
| 4 | `followup` | Follow-Up | 7-day sequence with 1-10 rating at each touchpoint. Category-contextual scripts. |
| 5 | `close` | Close | Merged closing techniques + objection handling. |
| 6 | `purchase_links` | Purchase Links | Subdomain + product URLs + Won/Lost outcome. |

### Steps Removed
- **Opening Approach** (`opening`) — removed entirely
- **Presentation** (`presentation`) — removed entirely

### Steps Merged
- **Closing** (`closing`) + **Objections** (`objections`) → **Close** (`close`)

---

## Discovery Step (Step 2) — Core Change

### 5 Universal Questions

Each question is a shareable script the rep reads aloud, with `ShareCopyButton`.

**Q1: Category Selection**
> "What's the one thing that could improve your quality of life right now?"

Dropdown with 13 curated categories:

| Label | Key | Maps to Product |
|-------|-----|-----------------|
| Pain Management | `pain_management` | Freedom |
| Better Sleep | `better_sleep` | REM |
| Improved Balance & Mobility | `balance_mobility` | Liberty |
| More Energy | `more_energy` | Boost |
| Peak Performance | `peak_performance` | Victory |
| Better Focus & Concentration | `better_focus` | Focus |
| Immune Support | `immune_support` | Defend |
| Weight Management | `weight_management` | Ignite |
| Breaking Bad Habits | `breaking_habits` | Kick It |
| Stress Relief | `stress_relief` | Peace |
| Better Mood | `better_mood` | Joy |
| Skin & Beauty | `skin_beauty` | Lumi |
| Men's Vitality | `mens_vitality` | Rocket |

**Q2: Quality Rating**
> "On a scale of 1-10, how would you rate your [category] right now?"

Slider 1-10. Labels: 1="Terrible", 5="Okay", 10="Excellent". This is the **baseline** for follow-up comparisons.

**Q3: Duration**
> "How long have you been dealing with this?"

Dropdown: Days, Weeks, Months, Years.

**Q4: What They've Tried**
> "What else have you tried or done to deal with your [category]?"

Multi-select dropdown:
- Prescription medication
- Over-the-counter medication
- Physical therapy
- Supplements / vitamins
- Exercise / yoga
- Meditation / mindfulness
- Chiropractic care
- Acupuncture
- Diet changes
- Nothing yet
- Other (free text)

**Q5: Results**
> "How did that work out for you?"

Free text input (2-3 lines).

### Continue Gate
Enabled when category + rating are filled. Q3-Q5 optional but encouraged. On continue, auto-sets `product_ids` from category mapping.

---

## Sample Step Changes (Step 3)

- Auto-suggested product from category pre-selected with badge: "Recommended based on their needs"
- "Add more products" toggle reveals full product grid
- Scripts reference category dynamically:
  > "I have something that might help with your [category]. It's called [Product]..."
- Address collection unchanged

---

## Follow-Up Changes (Step 4)

### 1-10 Rating at Each Touchpoint

Before "Mark Done & Advance", rep records:
> "On a scale of 1-10, how would you rate your [category] today?"

Same slider UI. Stored in `followup_ratings` JSONB: `{ "0": 6, "1": 7, ... }`.

**Improvement indicator**: "Started at 3/10, now 7/10 (+4)" with green trend arrow.

### Category-Contextual Scripts

Generated at runtime from templates keyed by category (not from per-product roadmap specs):

| Day | Script Template |
|-----|----------------|
| Day 1 | "Hi {{FirstName}}! Your [Product] samples are on their way! They should arrive in about 2 days." |
| Day 3 | "Hey {{FirstName}}! Have your [Product] samples arrived yet? When they do, don't open them without me — I want to walk you through exactly how to use them for best results." |
| Day 4 | "Let's open your [Product] together! Pay attention to what you notice about your [category], not what you expect." |
| Day 5 | "How is your [category label]? What's different since you started wearing the patch? Last time you rated it a [last_rating]/10 — where would you put it today?" |
| Day 7 | "You rated your [category label] a [baseline]/10 when we started. Where would you put it today? What's the biggest change you've noticed?" |
| Day 14 | "You started at [baseline]/10 and now you're at [current]/10 — that's a [diff]-point improvement! Who else in your life could benefit from this kind of change?" |
| Day 14 | "You've seen real results with [Product]. Ready to make this part of your routine? I can set you up so you never run out." |

### Improvement Trajectory Card

Small visual at top of Follow-Up showing all recorded ratings:
- X-axis: Day 1, 3, 5, 7, 14
- Y-axis: 1-10
- Baseline as dashed line
- Current trend visible

---

## Merged Close Step (Step 5)

### Section A: Closing Techniques (top)
- Pre-close text referencing improvement data: "You started at [baseline]/10 and you're at [current]/10 now..."
- 3-5 technique cards (Assumptive, Alternative, Urgency, Summary, Referral)
- Scripts with `ShareCopyButton`

### Section B: Objection Handling (collapsible, below)
- Default collapsed — opened only if prospect pushes back
- Same objection cards: tap to expand, response + psychology
- `ShareCopyButton` on each response
- Toggle to mark encountered objections

### Continue Gate
Enabled when a closing technique is selected OR objections handled.

---

## Database Changes

### New Columns on `d2c_contacts`

```sql
ALTER TABLE d2c_contacts
  ADD COLUMN discovery_category text,
  ADD COLUMN discovery_quality_rating integer,
  ADD COLUMN discovery_duration text,
  ADD COLUMN discovery_tried_before text[] DEFAULT '{}',
  ADD COLUMN discovery_tried_result text,
  ADD COLUMN followup_ratings jsonb DEFAULT '{}';
```

### Updated Types

`ContactStep` union type changes:
- Remove: `opening`, `presentation`, `closing`, `objections`
- Add: `close`
- Keep: `add_contact`, `discovery`, `samples`, `followup`, `purchase_links`, `closed`

`DecisionTreeState` changes:
- Remove: `openingTypes`
- Add: `discoveryCategory`, `discoveryQualityRating`, `discoveryDuration`, `discoveryTriedBefore`, `discoveryTriedResult`, `followupRatings`

### Updated STALENESS_THRESHOLDS

```typescript
export const STALENESS_THRESHOLDS: Record<ContactStep, number> = {
  add_contact: 2,
  discovery: 2,
  samples: 2,
  followup: 0,
  close: 2,
  purchase_links: 2,
  closed: Infinity,
};
```

---

## Migration Strategy (Existing Contacts)

Non-destructive — old columns preserved.

| Current Step | Maps To |
|-------------|---------|
| `add_contact` | `add_contact` (no change) |
| `opening` | `discovery` |
| `discovery` | `discovery` |
| `presentation` | `samples` |
| `samples` | `samples` |
| `followup` | `followup` |
| `closing` | `close` |
| `objections` | `close` |
| `purchase_links` | `purchase_links` |
| `closed` | `closed` |

Step mapping handled in `stepIdToIndex()` and `contactToState()`.

---

## Files Changed

### New Files
- `src/components/sales-flow/step-discovery-v2.tsx` — New universal discovery step
- `src/components/sales-flow/step-close.tsx` — Merged closing + objections
- `src/data/discovery-categories.ts` — Category definitions + product mapping
- `src/data/followup-templates.ts` — Category-contextual follow-up script templates

### Modified Files
- `src/types/roadmap.ts` — Update `SalesStep`, `SALES_STEPS`
- `src/lib/db/types.ts` — Update `ContactStep`, `Contact` Row/Insert/Update types, add discovery + followup_ratings columns
- `src/types/reminders.ts` — Update `STALENESS_THRESHOLDS`
- `src/components/sales-flow/decision-tree.tsx` — Rewrite step orchestration, state, save payload, renderStep
- `src/components/sales-flow/step-add-contact.tsx` — Remove product selection grid
- `src/components/sales-flow/step-send-samples.tsx` — Add auto-suggest from category
- `src/components/sales-flow/step-followup.tsx` — Add 1-10 rating slider, improvement trajectory, contextual scripts
- `src/lib/actions/contacts.ts` — Update save payload, step mappings, analytics
- `src/components/contacts/contact-sheet.tsx` — Update step references if any

### Removed/Archived Files
- `src/components/sales-flow/step-opening-picker.tsx` — Deleted
- `src/components/sales-flow/step-presentation.tsx` — Deleted
- `src/components/sales-flow/step-discovery.tsx` — Replaced by v2
- `src/components/sales-flow/step-closing.tsx` — Replaced by merged close
- `src/components/sales-flow/step-objections.tsx` — Replaced by merged close
