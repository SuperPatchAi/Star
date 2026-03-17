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
