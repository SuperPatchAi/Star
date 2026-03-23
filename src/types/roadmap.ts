export interface RoadmapMetadata {
  product: string;
  category: string;
  tagline: string;
  benefits: string[];
  type: string;
  purpose: string;
  generated: string;
}

export interface RoadmapCustomerProfile {
  title: string;
  description: string;
  content: {
    demographics: string[];
    psychographics: string[];
    pain_points: string[];
    tried_before: string[];
  };
}

export interface RoadmapApproach {
  type: string;
  context: string;
  script: string;
}

export interface RoadmapOpeningApproaches {
  title: string;
  description: string;
  approaches: RoadmapApproach[];
}

export interface RoadmapDiscoveryQuestion {
  type: string;
  question: string;
}

export interface RoadmapDiscovery {
  title: string;
  description: string;
  questions: RoadmapDiscoveryQuestion[];
}

export interface RoadmapPresentation {
  title: string;
  framework: string;
  content: {
    problem: string;
    agitate: string;
    solve: string;
    key_benefits: string[];
    differentiator: string;
  };
}

export interface RoadmapObjection {
  objection: string;
  trigger: string;
  response: string;
  psychology: string;
}

export interface RoadmapObjectionHandling {
  title: string;
  technique: string;
  objections: RoadmapObjection[];
}

export interface RoadmapClosingTechnique {
  name: string;
  script: string;
  when: string;
  icon: string;
}

export interface RoadmapClosing {
  title: string;
  pre_close: string;
  techniques: RoadmapClosingTechnique[];
}

export interface RoadmapFollowUpStep {
  day: string;
  action: string;
  template: string;
  channel: string;
  checkbox_label?: string;
}

export interface RoadmapFollowUp {
  title: string;
  goal: string;
  sequence: RoadmapFollowUpStep[];
}

export interface RoadmapRapportStory {
  title: string;
  description: string;
  personal_story: string;
  talking_points: string[];
  transition_to_discovery: string;
}

export interface RoadmapV2 {
  metadata: RoadmapMetadata;
  sections: {
    "1_customer_profile": RoadmapCustomerProfile;
    "2_opening_approaches": RoadmapOpeningApproaches;
    "2b_rapport_story": RoadmapRapportStory;
    "3_discovery_questions": RoadmapDiscovery;
    "4_presentation": RoadmapPresentation;
    "5_objection_handling": RoadmapObjectionHandling;
    "6_closing": RoadmapClosing;
    "7_followup": RoadmapFollowUp;
  };
}

export type SalesStep =
  | "add_contact"
  | "rapport"
  | "discovery"
  | "samples"
  | "followup"
  | "close"
  | "purchase_links";

export const SALES_STEPS: { id: SalesStep; label: string; number: number }[] = [
  { id: "add_contact", label: "Add Contact", number: 1 },
  { id: "rapport", label: "Rapport", number: 2 },
  { id: "discovery", label: "Discovery", number: 3 },
  { id: "samples", label: "Send Samples", number: 4 },
  { id: "followup", label: "Follow-Up", number: 5 },
  { id: "close", label: "Close", number: 6 },
  { id: "purchase_links", label: "Purchase Links", number: 7 },
];
