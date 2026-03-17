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
