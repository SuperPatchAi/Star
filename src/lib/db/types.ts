export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'user';

export type ContactStep = 'add_contact' | 'opening' | 'discovery' | 'presentation' | 'samples' | 'followup' | 'closing' | 'objections' | 'purchase_links' | 'closed';
export type ContactOutcome = 'pending' | 'won' | 'lost' | 'follow_up';

export interface TimestampedQuestion {
  question: string;
  asked_at: string;
}

export interface TimestampedObjection {
  objection: string;
  encountered_at: string;
}

/** Legacy format: string[]. New format: TimestampedQuestion[]. Use normalizeQuestions() to handle both. */
export type QuestionsAsked = Record<string, TimestampedQuestion[]>;
/** Legacy format: string[]. New format: TimestampedObjection[]. Use normalizeObjections() to handle both. */
export type ObjectionsEncountered = Record<string, TimestampedObjection[]>;

export function normalizeQuestions(raw: unknown): TimestampedQuestion[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === 'string') {
    return (raw as string[]).map(q => ({ question: q, asked_at: '' }));
  }
  return raw as TimestampedQuestion[];
}

export function normalizeObjections(raw: unknown): TimestampedObjection[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === 'string') {
    return (raw as string[]).map(o => ({ objection: o, encountered_at: '' }));
  }
  return raw as TimestampedObjection[];
}

export type OnboardingStep = 'carousel' | 'tour' | 'checklist' | 'completed';
export type OnboardingChecklist = {
  add_first_contact: boolean;
  start_first_conversation: boolean;
  complete_sales_step: boolean;
  send_first_sample: boolean;
  setup_followup: boolean;
};

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          is_active: boolean;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
          onboarding_step: OnboardingStep;
          onboarding_checklist: OnboardingChecklist;
          store_subdomain: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          is_active?: boolean;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarding_step?: OnboardingStep;
          onboarding_checklist?: OnboardingChecklist;
          store_subdomain?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          is_active?: boolean;
          invited_by?: string | null;
          updated_at?: string;
          onboarding_step?: OnboardingStep;
          onboarding_checklist?: OnboardingChecklist;
          store_subdomain?: string | null;
        };
      };
      d2c_contacts: {
        Row: {
          id: string;
          user_id: string;
          product_ids: string[];
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          address_line1: string | null;
          address_line2: string | null;
          address_city: string | null;
          address_state: string | null;
          address_zip: string | null;
          notes: string | null;
          current_step: ContactStep;
          opening_types: Record<string, string>;
          objections_encountered: ObjectionsEncountered;
          closing_techniques: Record<string, string>;
          questions_asked: QuestionsAsked;
          sample_sent: boolean;
          sample_sent_at: string | null;
          sample_products: string[];
          /** Repurposed: true = prospect confirmed they received the samples */
          sample_followup_done: boolean;
          outcome: ContactOutcome;
          follow_up_day: number | null;
          peak_step: string | null;
          stage_entered_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_ids: string[];
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_zip?: string | null;
          notes?: string | null;
          current_step?: ContactStep;
          opening_types?: Record<string, string>;
          objections_encountered?: ObjectionsEncountered;
          closing_techniques?: Record<string, string>;
          questions_asked?: QuestionsAsked;
          sample_sent?: boolean;
          sample_sent_at?: string | null;
          sample_products?: string[];
          sample_followup_done?: boolean;
          outcome?: ContactOutcome;
          follow_up_day?: number | null;
          peak_step?: string | null;
          stage_entered_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          product_ids?: string[];
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_zip?: string | null;
          notes?: string | null;
          current_step?: ContactStep;
          opening_types?: Record<string, string>;
          objections_encountered?: ObjectionsEncountered;
          closing_techniques?: Record<string, string>;
          questions_asked?: QuestionsAsked;
          sample_sent?: boolean;
          sample_sent_at?: string | null;
          sample_products?: string[];
          sample_followup_done?: boolean;
          outcome?: ContactOutcome;
          follow_up_day?: number | null;
          peak_step?: string | null;
          stage_entered_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

export type Contact = Database['public']['Tables']['d2c_contacts']['Row'];
export type ContactInsert = Database['public']['Tables']['d2c_contacts']['Insert'];
export type ContactUpdate = Database['public']['Tables']['d2c_contacts']['Update'];
