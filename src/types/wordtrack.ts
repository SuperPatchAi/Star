export interface OpeningScript {
  id?: string;
  title: string;
  scenario?: string;
  script?: string;
  content?: string;
}

export interface DiscoveryQuestion {
  id?: string;
  category?: "opening" | "pain_point" | "impact" | "solution" | "decision" | "future" | "practice" | "patient" | "current" | "pain";
  question: string;
}

export interface ObjectionResponse {
  id?: string;
  objection: string;
  response: string;
  psychology?: string;
}

export interface ClosingScript {
  id?: string;
  title: string;
  type?: "assumptive" | "alternative" | "urgency" | "summary" | "trial" | "referral" | "business_model" | "solution";
  scenario?: string;
  script?: string;
  content?: string;
}

export interface FollowUpItem {
  day: string;
  title: string;
  voicemail?: string;
  email?: string;
  text?: string;
  phone?: string;
}

export interface TestimonialPrompt {
  id: string;
  question: string;
}

export interface QuickReference {
  keyBenefits: string[];
  bestQuestions: string[];
  topObjections: { objection: string; response?: string; shortResponse?: string }[];
  bestClosingLines: string[];
  keyStats?: string[];
}

export interface ProductPresentation {
  problem: string;
  agitate: string;
  solve: string;
  explain?: string;
  fullScript?: string;
}

export interface CustomerProfile {
  demographics: {
    age?: string;
    gender?: string;
    lifestyle?: string[];
    healthStatus?: string;
  };
  psychographics: {
    values?: string[];
    attitudes?: string[];
    desires?: string[];
    concerns?: string[];
  };
  painPoints: string[];
  previousSolutions: string[];
}

export interface IdealCustomerProfile {
  demographics?: string;
  psychographics?: string;
  painPoints?: string[];
  previousSolutions?: string[];
}

export interface WordTrack {
  id: string;
  productId?: string;
  productName?: string;
  market?: string;
  marketId?: string;
  title?: string;
  tagline?: string;
  category?: string;
  benefits?: string[];
  
  overview?: string;
  productOverview?: string;
  
  customerProfile?: CustomerProfile;
  idealCustomerProfile?: IdealCustomerProfile;
  
  openingScripts?: OpeningScript[];
  discoveryQuestions?: DiscoveryQuestion[];
  productPresentation?: ProductPresentation | string;
  objections?: ObjectionResponse[];
  objectionHandling?: ObjectionResponse[];
  closingScripts?: ClosingScript[];
  followUpSequence?: FollowUpItem[];
  followUpSequences?: FollowUpItem[];
  testimonialPrompts?: TestimonialPrompt[];
  quickReference?: QuickReference;
}

export interface WordTrackCollection {
  [productId: string]: WordTrack;
}
