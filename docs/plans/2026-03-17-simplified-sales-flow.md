# Simplified Sales Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the sales flow from 9 steps to 6, with universal discovery questions, auto-suggested products, category-contextual follow-up with quantifiable 1-10 ratings, and merged closing/objections.

**Architecture:** Replace fixed product-specific discovery with universal category-based questions. Auto-map categories to products. Track improvement ratings at each follow-up touchpoint. Merge closing + objections into single step.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, shadcn/ui, Supabase, Tailwind CSS 4

---

### Task 1: Add Database Columns via Supabase Migration

**Files:**
- Modify: Supabase dashboard (SQL editor)

**Step 1: Run SQL migration in Supabase**

```sql
ALTER TABLE d2c_contacts
  ADD COLUMN IF NOT EXISTS discovery_category text,
  ADD COLUMN IF NOT EXISTS discovery_quality_rating integer,
  ADD COLUMN IF NOT EXISTS discovery_duration text,
  ADD COLUMN IF NOT EXISTS discovery_tried_before text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS discovery_tried_result text,
  ADD COLUMN IF NOT EXISTS followup_ratings jsonb DEFAULT '{}';
```

**Step 2: Verify columns exist**

Run: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'd2c_contacts' AND column_name LIKE 'discovery_%' OR column_name = 'followup_ratings';`

Expected: 6 new columns returned.

**Step 3: Commit**

No code commit needed — this is a DB migration.

---

### Task 2: Create Discovery Categories Data File

**Files:**
- Create: `src/data/discovery-categories.ts`

**Step 1: Create the categories data file**

```typescript
export interface DiscoveryCategory {
  key: string;
  label: string;
  productId: string;
  categoryLabel: string;
}

export const DISCOVERY_CATEGORIES: DiscoveryCategory[] = [
  { key: "pain_management", label: "Pain Management", productId: "freedom", categoryLabel: "pain management" },
  { key: "better_sleep", label: "Better Sleep", productId: "rem", categoryLabel: "sleep quality" },
  { key: "balance_mobility", label: "Improved Balance & Mobility", productId: "liberty", categoryLabel: "balance and mobility" },
  { key: "more_energy", label: "More Energy", productId: "boost", categoryLabel: "energy levels" },
  { key: "peak_performance", label: "Peak Performance", productId: "victory", categoryLabel: "performance" },
  { key: "better_focus", label: "Better Focus & Concentration", productId: "focus", categoryLabel: "focus and concentration" },
  { key: "immune_support", label: "Immune Support", productId: "defend", categoryLabel: "immune health" },
  { key: "weight_management", label: "Weight Management", productId: "ignite", categoryLabel: "metabolism" },
  { key: "breaking_habits", label: "Breaking Bad Habits", productId: "kick-it", categoryLabel: "willpower" },
  { key: "stress_relief", label: "Stress Relief", productId: "peace", categoryLabel: "stress levels" },
  { key: "better_mood", label: "Better Mood", productId: "joy", categoryLabel: "mood" },
  { key: "skin_beauty", label: "Skin & Beauty", productId: "lumi", categoryLabel: "skin health" },
  { key: "mens_vitality", label: "Men's Vitality", productId: "rocket", categoryLabel: "vitality" },
];

export const TRIED_BEFORE_OPTIONS = [
  "Prescription medication",
  "Over-the-counter medication",
  "Physical therapy",
  "Supplements / vitamins",
  "Exercise / yoga",
  "Meditation / mindfulness",
  "Chiropractic care",
  "Acupuncture",
  "Diet changes",
  "Nothing yet",
  "Other",
];

export const DURATION_OPTIONS = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
];

export function getCategoryByKey(key: string): DiscoveryCategory | undefined {
  return DISCOVERY_CATEGORIES.find(c => c.key === key);
}

export function getCategoryByProductId(productId: string): DiscoveryCategory | undefined {
  return DISCOVERY_CATEGORIES.find(c => c.productId === productId);
}
```

**Step 2: Commit**

```bash
git add src/data/discovery-categories.ts
git commit -m "feat: add discovery categories data with product mapping"
```

---

### Task 3: Create Follow-Up Script Templates

**Files:**
- Create: `src/data/followup-templates.ts`

**Step 1: Create the follow-up templates file**

```typescript
export interface FollowUpTemplate {
  day: string;
  action: string;
  channel: string;
  template: string;
  includesRating: boolean;
  checkboxLabel?: string;
}

export const FOLLOWUP_SEQUENCE: FollowUpTemplate[] = [
  {
    day: "DAY 1",
    action: "Shipping Follow-Up",
    channel: "Text",
    template: "Hi {{FirstName}}! Your {{ProductName}} samples are on their way! They should arrive in about 2 days. I'm excited for you to try them — I'll check in when they arrive! 📦",
    includesRating: false,
  },
  {
    day: "DAY 3",
    action: "Sample Arrival",
    channel: "Text",
    template: "Hey {{FirstName}}! Have your {{ProductName}} samples arrived yet? When they do, don't open them without me — I want to walk you through exactly how to use them for the best results with your {{categoryLabel}}. 🎯",
    includesRating: false,
  },
  {
    day: "DAY 4",
    action: "Open Together",
    channel: "Zoom",
    template: "Let's open your {{ProductName}} together! Here's the key: pay attention to what you notice about your {{categoryLabel}}, not what you expect. Just observe. The patch works with your body's natural systems — give it time and stay open to what you feel. 🔬",
    includesRating: true,
    checkboxLabel: "Samples received & opened together",
  },
  {
    day: "DAY 5",
    action: "Experience Check-In",
    channel: "Text/Call",
    template: "Hey {{FirstName}}! How is your {{categoryLabel}}? What's different since you started wearing the patch? You rated your {{categoryLabel}} a {{lastRating}}/10 — where would you put it today?",
    includesRating: true,
  },
  {
    day: "DAY 7",
    action: "Results Follow-Up",
    channel: "Call",
    template: "{{FirstName}}, when we first talked you rated your {{categoryLabel}} a {{baseline}}/10. Where would you put it today? What's the biggest change you've noticed?",
    includesRating: true,
  },
  {
    day: "DAY 14",
    action: "Reorder + Referral",
    channel: "Call",
    template: "{{FirstName}}, you started at {{baseline}}/10 for {{categoryLabel}} and now you're at {{currentRating}}/10 — that's a {{improvement}}-point improvement! Who else in your life could benefit from this kind of change?",
    includesRating: true,
  },
  {
    day: "DAY 14",
    action: "Ask for the Close",
    channel: "Call",
    template: "You've seen real results with {{ProductName}} — from {{baseline}}/10 to {{currentRating}}/10 for your {{categoryLabel}}. Ready to make this part of your routine? I can set you up so you never run out.",
    includesRating: false,
  },
];

export function interpolateFollowUpTemplate(
  template: string,
  vars: {
    firstName: string;
    productName: string;
    categoryLabel: string;
    baseline?: number;
    lastRating?: number;
    currentRating?: number;
    improvement?: number;
  }
): string {
  let result = template;
  result = result.replace(/\{\{FirstName\}\}/g, vars.firstName);
  result = result.replace(/\{\{ProductName\}\}/g, vars.productName);
  result = result.replace(/\{\{categoryLabel\}\}/g, vars.categoryLabel);
  if (vars.baseline !== undefined) result = result.replace(/\{\{baseline\}\}/g, String(vars.baseline));
  if (vars.lastRating !== undefined) result = result.replace(/\{\{lastRating\}\}/g, String(vars.lastRating));
  if (vars.currentRating !== undefined) result = result.replace(/\{\{currentRating\}\}/g, String(vars.currentRating));
  if (vars.improvement !== undefined) result = result.replace(/\{\{improvement\}\}/g, String(vars.improvement));
  return result;
}
```

**Step 2: Commit**

```bash
git add src/data/followup-templates.ts
git commit -m "feat: add category-contextual follow-up script templates with rating interpolation"
```

---

### Task 4: Update Type Definitions

**Files:**
- Modify: `src/types/roadmap.ts`
- Modify: `src/lib/db/types.ts`
- Modify: `src/types/reminders.ts`

**Step 1: Update `src/types/roadmap.ts`**

Replace `SalesStep` type and `SALES_STEPS` array:

```typescript
export type SalesStep =
  | "add_contact"
  | "discovery"
  | "samples"
  | "followup"
  | "close"
  | "purchase_links";

export const SALES_STEPS: { id: SalesStep; label: string; number: number }[] = [
  { id: "add_contact", label: "Add Contact", number: 1 },
  { id: "discovery", label: "Discovery", number: 2 },
  { id: "samples", label: "Send Samples", number: 3 },
  { id: "followup", label: "Follow-Up", number: 4 },
  { id: "close", label: "Close", number: 5 },
  { id: "purchase_links", label: "Purchase Links", number: 6 },
];
```

Keep all Roadmap interfaces unchanged (they're still used for product-specific content in close step).

**Step 2: Update `src/lib/db/types.ts`**

Update `ContactStep`:

```typescript
export type ContactStep = 'add_contact' | 'discovery' | 'samples' | 'followup' | 'close' | 'purchase_links' | 'closed';
```

Add legacy step mapping helper:

```typescript
const LEGACY_STEP_MAP: Record<string, ContactStep> = {
  opening: 'discovery',
  presentation: 'samples',
  closing: 'close',
  objections: 'close',
};

export function normalizeContactStep(step: string): ContactStep {
  return (LEGACY_STEP_MAP[step] as ContactStep) || (step as ContactStep);
}
```

Add new columns to `Contact` Row type:

```typescript
discovery_category: string | null;
discovery_quality_rating: number | null;
discovery_duration: string | null;
discovery_tried_before: string[];
discovery_tried_result: string | null;
followup_ratings: Record<string, number>;
```

Add corresponding optional fields to Insert and Update types.

**Step 3: Update `src/types/reminders.ts`**

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

**Step 4: Commit**

```bash
git add src/types/roadmap.ts src/lib/db/types.ts src/types/reminders.ts
git commit -m "feat: update type definitions for 6-step flow with discovery columns"
```

---

### Task 5: Build Discovery V2 Step Component

**Files:**
- Create: `src/components/sales-flow/step-discovery-v2.tsx`

**Step 1: Create the new discovery component**

Build a component with these props:

```typescript
interface StepDiscoveryV2Props {
  discoveryCategory: string | null;
  discoveryQualityRating: number | null;
  discoveryDuration: string | null;
  discoveryTriedBefore: string[];
  discoveryTriedResult: string | null;
  contactFirstName: string;
  onCategoryChange: (key: string) => void;
  onQualityRatingChange: (rating: number) => void;
  onDurationChange: (duration: string) => void;
  onTriedBeforeChange: (items: string[]) => void;
  onTriedResultChange: (result: string) => void;
  onContinue: () => void;
}
```

UI requirements:
- Card-based layout with each question as a section
- `ShareCopyButton` on each question text (the script the rep reads aloud)
- Q1: shadcn `Select` component with 13 categories from `DISCOVERY_CATEGORIES`
- Q2: shadcn `Slider` (1-10) with labels. Show number prominently.
- Q3: shadcn `Select` with duration options
- Q4: Multi-select with checkboxes for `TRIED_BEFORE_OPTIONS`. "Other" option shows text input.
- Q5: shadcn `Textarea` for free text
- All question texts dynamically replace `[category]` with the selected category's `categoryLabel`
- Continue button enabled when category + rating filled. Label: "Continue to Send Samples"

**Step 2: Commit**

```bash
git add src/components/sales-flow/step-discovery-v2.tsx
git commit -m "feat: build universal discovery step with category selection and shareable scripts"
```

---

### Task 6: Build Merged Close Step Component

**Files:**
- Create: `src/components/sales-flow/step-close.tsx`

**Step 1: Create the merged close component**

Props:

```typescript
interface StepCloseProps {
  closingData: RoadmapClosing;
  objectionData: RoadmapObjectionHandling;
  selectedTechnique: string | null;
  encounteredObjections: string[];
  onSelectTechnique: (technique: string) => void;
  onToggleObjection: (objection: string) => void;
  onContinue: () => void;
  contactFirstName: string;
  baseline?: number;
  currentRating?: number;
  categoryLabel?: string;
  continueLabel: string;
}
```

UI requirements:
- Top section: Closing Techniques
  - Pre-close text referencing improvement: "You started at [baseline]/10 and you're at [current]/10..."
  - Technique cards same as current `step-closing.tsx` behavior
  - `ShareCopyButton` on scripts
- Bottom section: Collapsible "Handle Objections"
  - shadcn `Collapsible` component, default closed
  - Same objection cards as current `step-objections.tsx`
  - `ShareCopyButton` on responses
- Continue: enabled when technique selected OR "No Objections" toggled

**Step 2: Commit**

```bash
git add src/components/sales-flow/step-close.tsx
git commit -m "feat: build merged close step with closing techniques and collapsible objections"
```

---

### Task 7: Modify Add Contact Step (Remove Product Selection)

**Files:**
- Modify: `src/components/sales-flow/step-add-contact.tsx`

**Step 1: Remove product selection from StepAddContact**

Remove:
- `selectedProductIds` state
- `toggleProduct` function
- Product grid UI (the entire "Which products are you presenting?" section)
- Product validation (`selectedProductIds.length === 0` check)

Change `createContact` call to pass `product_ids: []` (empty — will be set by discovery).

Change button label to "Create Contact & Continue" (same, but no longer disabled by product selection).

Remove the `allProducts` import and `Image` import for product grid.

In the `existingContact` view, remove the product badges display (contacts may not have products yet at this step).

**Step 2: Commit**

```bash
git add src/components/sales-flow/step-add-contact.tsx
git commit -m "feat: simplify add contact step by removing product selection"
```

---

### Task 8: Modify Send Samples Step (Add Auto-Suggest)

**Files:**
- Modify: `src/components/sales-flow/step-send-samples.tsx`

**Step 1: Add auto-suggest to StepSendSamples**

Add new props:

```typescript
discoveryCategory: string | null;
```

Changes:
- Import `getCategoryByKey` from `discovery-categories.ts`
- When `discoveryCategory` is set and `sampleProducts` is empty, auto-select the mapped product
- Show a badge: "Recommended based on their needs" next to the auto-suggested product
- Add "Add more products" collapsible toggle to reveal full product grid
- Update sample offer script to reference category: "I have something that might help with your [categoryLabel]..."

**Step 2: Commit**

```bash
git add src/components/sales-flow/step-send-samples.tsx
git commit -m "feat: add product auto-suggestion based on discovery category"
```

---

### Task 9: Modify Follow-Up Step (Add Ratings + Contextual Scripts)

**Files:**
- Modify: `src/components/sales-flow/step-followup.tsx`

**Step 1: Add rating slider to each follow-up touchpoint**

Add new props:

```typescript
discoveryCategory: string | null;
discoveryQualityRating: number | null;
followupRatings: Record<string, number>;
onFollowupRatingChange: (dayIndex: number, rating: number) => void;
```

Changes:
- Import `FOLLOWUP_SEQUENCE`, `interpolateFollowUpTemplate` from `followup-templates.ts`
- Import `getCategoryByKey` from `discovery-categories.ts`
- Use `FOLLOWUP_SEQUENCE` instead of roadmap `7_followup` data
- At each touchpoint that has `includesRating: true`, show a 1-10 slider before "Mark Done & Advance"
- Show improvement indicator: "Started at [baseline]/10, now [current]/10 (+diff)" with green arrow
- Interpolate scripts with category, product name, baseline, last rating, current rating

**Step 2: Build improvement trajectory card**

Add a small card at the top of Follow-Up:
- Use inline SVG or a simple bar visualization (no heavy chart library)
- X-axis labels: Day 1, 3, 5, 7, 14
- Y-axis: 1-10
- Baseline shown as dashed line
- Filled bars or dots for recorded ratings
- Only shown when at least 1 rating exists

**Step 3: Commit**

```bash
git add src/components/sales-flow/step-followup.tsx
git commit -m "feat: add 1-10 rating tracking and category-contextual scripts to follow-up"
```

---

### Task 10: Rewrite Decision Tree Orchestrator

**Files:**
- Modify: `src/components/sales-flow/decision-tree.tsx`

**Step 1: Update imports**

Remove imports:
- `StepOpeningPicker`
- `StepDiscovery` (old)
- `StepPresentation`
- `StepObjections`
- `StepClosing`

Add imports:
- `StepDiscoveryV2` from `./step-discovery-v2`
- `StepClose` from `./step-close`
- `getCategoryByKey` from `@/data/discovery-categories`

**Step 2: Update DecisionTreeState**

```typescript
export interface DecisionTreeState {
  // Discovery
  discoveryCategory: string | null;
  discoveryQualityRating: number | null;
  discoveryDuration: string | null;
  discoveryTriedBefore: string[];
  discoveryTriedResult: string | null;
  // Samples
  sampleAgreed: boolean;
  sampleProducts: string[];
  sampleAddress: SampleAddress | null;
  sampleReceived: boolean;
  // Follow-up
  followupRatings: Record<string, number>;
  // Close
  questionsAsked: QuestionsAsked;          // kept for legacy/analytics
  objectionsEncountered: ObjectionsEncountered;
  closingTechniques: Record<string, string>;
}
```

**Step 3: Update contactToState()**

Map old contact data to new state shape. Use `normalizeContactStep()` for step mapping.

```typescript
function contactToState(contact: Contact): DecisionTreeState {
  return {
    discoveryCategory: contact.discovery_category || null,
    discoveryQualityRating: contact.discovery_quality_rating || null,
    discoveryDuration: contact.discovery_duration || null,
    discoveryTriedBefore: contact.discovery_tried_before || [],
    discoveryTriedResult: contact.discovery_tried_result || null,
    sampleAgreed: contact.sample_sent,
    sampleProducts: contact.sample_products || [],
    sampleReceived: contact.sample_followup_done,
    sampleAddress: contact.address_line1
      ? { line1: contact.address_line1 || "", line2: contact.address_line2 || "", city: contact.address_city || "", state: contact.address_state || "", zip: contact.address_zip || "" }
      : null,
    followupRatings: (contact.followup_ratings as Record<string, number>) || {},
    questionsAsked: normalizeQuestionsRecord(contact.questions_asked),
    objectionsEncountered: normalizeObjectionsRecord(contact.objections_encountered),
    closingTechniques: asRecord(contact.closing_techniques, {}),
  };
}
```

**Step 4: Update stepIdToIndex() to handle legacy steps**

```typescript
function stepIdToIndex(stepId: string): number {
  const normalized = normalizeContactStep(stepId);
  const idx = SALES_STEPS.findIndex((s) => s.id === normalized);
  return idx >= 0 ? idx : 0;
}
```

**Step 5: Update STEP_ICONS**

```typescript
const STEP_ICONS: Record<string, React.ElementType> = {
  add_contact: UserPlus,
  discovery: HelpCircle,
  samples: Package,
  followup: CalendarCheck,
  close: Handshake,
  purchase_links: ShoppingCart,
};
```

**Step 6: Update buildSavePayload()**

```typescript
const buildSavePayload = useCallback(() => ({
  current_step: currentStep.id,
  product_ids: activeContact?.product_ids || [],
  discovery_category: state.discoveryCategory,
  discovery_quality_rating: state.discoveryQualityRating,
  discovery_duration: state.discoveryDuration,
  discovery_tried_before: state.discoveryTriedBefore,
  discovery_tried_result: state.discoveryTriedResult,
  questions_asked: state.questionsAsked,
  objections_encountered: state.objectionsEncountered,
  closing_techniques: state.closingTechniques,
  sample_sent: state.sampleAgreed,
  sample_products: state.sampleProducts,
  sample_followup_done: state.sampleReceived,
  followup_ratings: state.followupRatings,
  address_line1: state.sampleAddress?.line1 || null,
  address_line2: state.sampleAddress?.line2 || null,
  address_city: state.sampleAddress?.city || null,
  address_state: state.sampleAddress?.state || null,
  address_zip: state.sampleAddress?.zip || null,
}), [currentStep.id, state, activeContact?.product_ids]);
```

**Step 7: Add discovery state callbacks**

```typescript
const setDiscoveryCategory = useCallback((key: string) => {
  setState(prev => ({ ...prev, discoveryCategory: key }));
  // Auto-set product_ids from category
  const cat = getCategoryByKey(key);
  if (cat && activeContact) {
    const newProductIds = [cat.productId];
    setActiveContact(prev => prev ? { ...prev, product_ids: newProductIds } : prev);
  }
}, [activeContact]);

const setDiscoveryQualityRating = useCallback((rating: number) => {
  setState(prev => ({ ...prev, discoveryQualityRating: rating }));
}, []);

const setDiscoveryDuration = useCallback((duration: string) => {
  setState(prev => ({ ...prev, discoveryDuration: duration }));
}, []);

const setDiscoveryTriedBefore = useCallback((items: string[]) => {
  setState(prev => ({ ...prev, discoveryTriedBefore: items }));
}, []);

const setDiscoveryTriedResult = useCallback((result: string) => {
  setState(prev => ({ ...prev, discoveryTriedResult: result }));
}, []);

const setFollowupRating = useCallback((dayIndex: number, rating: number) => {
  setState(prev => ({
    ...prev,
    followupRatings: { ...prev.followupRatings, [String(dayIndex)]: rating },
  }));
}, []);
```

**Step 8: Rewrite renderStep()**

```typescript
const renderStep = () => {
  switch (currentStep.id) {
    case "add_contact":
      return <StepAddContact onContactCreated={handleContactCreated} existingContact={activeContact} />;
    case "discovery":
      return (
        <StepDiscoveryV2
          discoveryCategory={state.discoveryCategory}
          discoveryQualityRating={state.discoveryQualityRating}
          discoveryDuration={state.discoveryDuration}
          discoveryTriedBefore={state.discoveryTriedBefore}
          discoveryTriedResult={state.discoveryTriedResult}
          contactFirstName={contactFirstName}
          onCategoryChange={setDiscoveryCategory}
          onQualityRatingChange={setDiscoveryQualityRating}
          onDurationChange={setDiscoveryDuration}
          onTriedBeforeChange={setDiscoveryTriedBefore}
          onTriedResultChange={setDiscoveryTriedResult}
          onContinue={goNext}
        />
      );
    case "samples":
      return (
        <StepSendSamples
          products={contactProducts}
          sampleAgreed={state.sampleAgreed}
          sampleProducts={state.sampleProducts}
          sampleAddress={state.sampleAddress}
          onSetSampleAgreed={setSampleAgreed}
          onToggleSampleProduct={toggleSampleProduct}
          onSetSampleAddress={setSampleAddress}
          onContinue={goNext}
          contactFirstName={contactFirstName}
          continueLabel={continueLabel}
          discoveryCategory={state.discoveryCategory}
        />
      );
    case "followup":
      return (
        <StepFollowUp
          contactId={activeContact?.id}
          followUpDay={followUpDay}
          onAdvance={handleAdvanceFollowUp}
          contactFirstName={contactFirstName}
          sampleReceived={state.sampleReceived}
          onSampleReceived={handleSampleReceived}
          continueLabel={continueLabel}
          onContinue={goNext}
          discoveryCategory={state.discoveryCategory}
          discoveryQualityRating={state.discoveryQualityRating}
          followupRatings={state.followupRatings}
          onFollowupRatingChange={setFollowupRating}
          sampleProducts={state.sampleProducts}
        />
      );
    case "close":
      return (
        <ProductTabs products={contactProducts}>
          {(product) => {
            const roadmap = roadmaps[product.id];
            if (!roadmap) return null;
            return (
              <StepClose
                closingData={roadmap.sections["6_closing"]}
                objectionData={roadmap.sections["5_objection_handling"]}
                selectedTechnique={state.closingTechniques[product.id] || null}
                encounteredObjections={(state.objectionsEncountered[product.id] || []).map(o => o.objection)}
                onSelectTechnique={(t) => setClosingTechnique(product.id, t)}
                onToggleObjection={(obj) => toggleObjection(product.id, obj)}
                onContinue={goNext}
                contactFirstName={contactFirstName}
                baseline={state.discoveryQualityRating || undefined}
                currentRating={getLatestRating(state.followupRatings)}
                categoryLabel={getCategoryByKey(state.discoveryCategory || "")?.categoryLabel}
                continueLabel={continueLabel}
              />
            );
          }}
        </ProductTabs>
      );
    case "purchase_links":
      return (
        <ProductTabs products={contactProducts}>
          {(product) => (
            <StepPurchaseLinks
              product={product}
              storeSubdomain={storeSubdomain}
              contactFirstName={contactFirstName}
              allProducts={contactProducts}
              onSubdomainSaved={setStoreSubdomain}
              contactId={activeContact?.id}
            />
          )}
        </ProductTabs>
      );
    default:
      return null;
  }
};
```

Add helper:

```typescript
function getLatestRating(ratings: Record<string, number>): number | undefined {
  const keys = Object.keys(ratings).map(Number).sort((a, b) => b - a);
  return keys.length > 0 ? ratings[String(keys[0])] : undefined;
}
```

**Step 9: Remove unused icon imports**

Remove: `MessageSquare`, `Presentation`, `ShieldAlert` from lucide imports.

**Step 10: Commit**

```bash
git add src/components/sales-flow/decision-tree.tsx
git commit -m "feat: rewrite decision tree for 6-step flow with discovery state and merged close"
```

---

### Task 11: Update Server Actions

**Files:**
- Modify: `src/lib/actions/contacts.ts`

**Step 1: Update updateContact to handle new fields**

The `updateContact` function already accepts `ContactUpdate` which will now include the new columns. No structural changes needed — just update the `SALES_STEPS` reference for onboarding checklist:

Change the `advancedStepIds` filter from `number >= 4` to `number >= 3` (Send Samples is now step 3):

```typescript
const advancedStepIds = SALES_STEPS.filter(s => s.number >= 3).map(s => s.id);
```

**Step 2: Update `getSalesAnalytics` to handle legacy data**

The analytics function reads `opening_types` and `closing_techniques` from contacts. These still exist in the DB for legacy data. No changes needed for backward compatibility.

**Step 3: Commit**

```bash
git add src/lib/actions/contacts.ts
git commit -m "feat: update server actions for 6-step flow"
```

---

### Task 12: Delete Old Step Components

**Files:**
- Delete: `src/components/sales-flow/step-opening-picker.tsx`
- Delete: `src/components/sales-flow/step-presentation.tsx`
- Delete: `src/components/sales-flow/step-discovery.tsx`
- Delete: `src/components/sales-flow/step-closing.tsx`
- Delete: `src/components/sales-flow/step-objections.tsx`

**Step 1: Delete the files**

```bash
git rm src/components/sales-flow/step-opening-picker.tsx
git rm src/components/sales-flow/step-presentation.tsx
git rm src/components/sales-flow/step-discovery.tsx
git rm src/components/sales-flow/step-closing.tsx
git rm src/components/sales-flow/step-objections.tsx
```

**Step 2: Verify no other files import deleted components**

Search for imports of removed components across the codebase. If any references exist outside decision-tree.tsx, update them.

**Step 3: Commit**

```bash
git commit -m "chore: remove old step components replaced by simplified flow"
```

---

### Task 13: Update Contact Sheet and Other References

**Files:**
- Modify: `src/components/contacts/contact-sheet.tsx` (if step references exist)
- Modify: any other files that reference old step IDs

**Step 1: Search for references to removed step IDs**

Search the codebase for: `"opening"`, `"presentation"`, `"closing"`, `"objections"` as step references. Update any found references to use the new step IDs or `normalizeContactStep()`.

**Step 2: Update contact sheet edit form**

The contact sheet edit mode has a step dropdown. Update it to show only the 6 new steps.

**Step 3: Update any pipeline/dashboard displays**

Check `dashboard/page.tsx` for pipeline counts that reference old step names. Update to new names.

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: update all references to old step IDs across codebase"
```

---

### Task 14: Update README.md

**Files:**
- Modify: `README.md`

**Step 1: Update README to reflect 6-step flow**

Update sales step documentation, data model, and architecture sections.

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for simplified 6-step sales flow"
```

---

### Task 15: Verify and Test

**Step 1: Run the dev server**

```bash
npm run dev
```

**Step 2: Test new contact flow**

1. Create a new contact (verify no product selection)
2. Complete discovery (select category, rate quality, answer questions)
3. Verify product auto-suggested at samples step
4. Complete samples (verify address form)
5. Walk through follow-up (verify 1-10 ratings appear, scripts are contextual)
6. Test close step (verify closing + collapsible objections)
7. Test purchase links (verify product URL)

**Step 3: Test existing contact migration**

Open an existing contact that was mid-flow (e.g., at "opening" step). Verify it maps correctly to "discovery" step.

**Step 4: Test auto-save**

Navigate through steps and close the drawer. Reopen — verify all state persisted.

**Step 5: Run build**

```bash
npm run build
```

Verify no TypeScript errors.
