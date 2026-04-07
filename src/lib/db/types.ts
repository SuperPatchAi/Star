export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'user';

export type ContactStep = 'add_contact' | 'rapport' | 'discovery' | 'samples' | 'followup' | 'close' | 'purchase_links' | 'closed';

const LEGACY_STEP_MAP: Record<string, ContactStep> = {
  opening: 'discovery',
  presentation: 'samples',
  closing: 'close',
  objections: 'close',
};

export function normalizeContactStep(step: string): ContactStep {
  return (LEGACY_STEP_MAP[step] as ContactStep) || (step as ContactStep);
}

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

export type NotificationPreferences = {
  follow_up_reminders: boolean;
  overdue_alerts: boolean;
  sample_check_ins: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  follow_up_reminders: true,
  overdue_alerts: true,
  sample_check_ins: true,
};

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'x';

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

export const SOCIAL_PLATFORMS: { key: SocialPlatform; label: string; prefix: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', prefix: 'instagram.com/', placeholder: 'yourhandle' },
  { key: 'facebook', label: 'Facebook', prefix: 'facebook.com/', placeholder: 'your.profile' },
  { key: 'tiktok', label: 'TikTok', prefix: 'tiktok.com/@', placeholder: 'yourhandle' },
  { key: 'youtube', label: 'YouTube', prefix: 'youtube.com/@', placeholder: 'yourchannel' },
  { key: 'linkedin', label: 'LinkedIn', prefix: 'linkedin.com/in/', placeholder: 'your-name' },
  { key: 'x', label: 'X', prefix: 'x.com/', placeholder: 'yourhandle' },
];

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
          notification_preferences: NotificationPreferences;
          social_links: SocialLinks;
          bydesign_rep_did: string | null;
          bydesign_api_username: string | null;
          bydesign_api_key_encrypted: string | null;
          bydesign_connected_at: string | null;
          bydesign_rank: string | null;
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
          notification_preferences?: NotificationPreferences;
          social_links?: SocialLinks;
          bydesign_rep_did?: string | null;
          bydesign_api_username?: string | null;
          bydesign_api_key_encrypted?: string | null;
          bydesign_connected_at?: string | null;
          bydesign_rank?: string | null;
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
          notification_preferences?: NotificationPreferences;
          social_links?: SocialLinks;
          bydesign_rep_did?: string | null;
          bydesign_api_username?: string | null;
          bydesign_api_key_encrypted?: string | null;
          bydesign_connected_at?: string | null;
          bydesign_rank?: string | null;
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
          sample_quantities: Record<string, number>;
          /** Repurposed: true = prospect confirmed they received the samples */
          sample_followup_done: boolean;
          outcome: ContactOutcome;
          follow_up_day: number | null;
          discovery_category: string[];
          discovery_quality_rating: number | null;
          discovery_duration: string | null;
          discovery_tried_before: string[];
          discovery_tried_result: string | null;
          followup_ratings: Record<string, number>;
          peak_step: string | null;
          stage_entered_at: string;
          created_at: string;
          updated_at: string;
          bydesign_customer_did: string | null;
          bydesign_matched_at: string | null;
          bydesign_match_confidence: string | null;
          bydesign_order_count: number;
          bydesign_total_spent: number;
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
          sample_quantities?: Record<string, number>;
          sample_followup_done?: boolean;
          outcome?: ContactOutcome;
          follow_up_day?: number | null;
          discovery_category?: string[];
          discovery_quality_rating?: number | null;
          discovery_duration?: string | null;
          discovery_tried_before?: string[];
          discovery_tried_result?: string | null;
          followup_ratings?: Record<string, number>;
          peak_step?: string | null;
          stage_entered_at?: string;
          created_at?: string;
          updated_at?: string;
          bydesign_customer_did?: string | null;
          bydesign_matched_at?: string | null;
          bydesign_match_confidence?: string | null;
          bydesign_order_count?: number;
          bydesign_total_spent?: number;
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
          sample_quantities?: Record<string, number>;
          sample_followup_done?: boolean;
          outcome?: ContactOutcome;
          follow_up_day?: number | null;
          discovery_category?: string[];
          discovery_quality_rating?: number | null;
          discovery_duration?: string | null;
          discovery_tried_before?: string[];
          discovery_tried_result?: string | null;
          followup_ratings?: Record<string, number>;
          peak_step?: string | null;
          stage_entered_at?: string;
          updated_at?: string;
          bydesign_customer_did?: string | null;
          bydesign_matched_at?: string | null;
          bydesign_match_confidence?: string | null;
          bydesign_order_count?: number;
          bydesign_total_spent?: number;
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

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  messages: Json;
  created_at: string;
  updated_at: string;
}

export type ChatSessionInsert = {
  id?: string;
  user_id: string;
  title?: string;
  messages?: Json;
};

export type ChatSessionUpdate = {
  title?: string;
  messages?: Json;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// Team / ByDesign types
// ---------------------------------------------------------------------------

export type InviteStatus = 'not_invited' | 'invited' | 'accepted' | 'declined';
export type MatchConfidence = 'email' | 'phone' | 'name' | 'manual';

export interface DownlineMember {
  id: string;
  leader_id: string;
  rep_did: string;
  rep_name: string | null;
  email: string | null;
  phone: string | null;
  rank: string | null;
  rank_type_id: number | null;
  level: number | null;
  pv: number;
  gv: number;
  join_date: string | null;
  has_autoship: boolean;
  rep_status: string | null;
  star_user_id: string | null;
  invite_token: string | null;
  invite_status: InviteStatus;
  invited_at: string | null;
  synced_at: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  leader_id: string;
  member_id: string;
  member_rep_did: string | null;
  level: number | null;
  joined_at: string;
  created_at: string;
}

export interface PurchaseMatch {
  id: string;
  user_id: string;
  contact_id: string;
  bydesign_customer_did: string;
  bydesign_order_id: number;
  order_date: string | null;
  order_total: number | null;
  order_status_id: number | null;
  products_purchased: { product_id: string; name: string; quantity: number }[];
  matched_at: string;
}

export interface TeamOverview {
  team_size: number;
  total_contacts: number;
  won_count: number;
  lost_count: number;
  pending_count: number;
  win_rate: number;
  avg_contacts_per_rep: number;
  active_follow_ups: number;
}

export interface TeamLeaderboardEntry {
  member_id: string;
  member_name: string;
  rank: number;
  metric_value: number;
}

export interface StrugglingMember {
  member_id: string;
  member_name: string;
  reason: string;
  severity_count: number;
  days_inactive?: number;
}

export interface TeamActivityEvent {
  member_name: string;
  event_type: string;
  description: string;
  created_at: string;
}

export interface MemberStats {
  member_name: string | null;
  rank: string | null;
  total_contacts: number;
  won: number;
  lost: number;
  pending: number;
  samples_sent: number;
  active_follow_ups: number;
  current_steps: Record<string, number>;
  last_activity_at: string | null;
}
