export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'user';

export type ContactStep = 'add_contact' | 'opening' | 'discovery' | 'presentation' | 'samples' | 'objections' | 'closing' | 'followup' | 'closed';
export type ContactOutcome = 'pending' | 'won' | 'lost' | 'follow_up';

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
        };
      };
      d2c_contacts: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address_line1: string | null;
          address_line2: string | null;
          address_city: string | null;
          address_state: string | null;
          address_zip: string | null;
          notes: string | null;
          current_step: ContactStep;
          opening_type: string | null;
          objections_encountered: string[];
          closing_technique: string | null;
          questions_asked: string[];
          sample_sent: boolean;
          sample_sent_at: string | null;
          sample_product: string | null;
          outcome: ContactOutcome;
          follow_up_day: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_zip?: string | null;
          notes?: string | null;
          current_step?: ContactStep;
          opening_type?: string | null;
          objections_encountered?: string[];
          closing_technique?: string | null;
          questions_asked?: string[];
          sample_sent?: boolean;
          sample_sent_at?: string | null;
          sample_product?: string | null;
          outcome?: ContactOutcome;
          follow_up_day?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          product_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_zip?: string | null;
          notes?: string | null;
          current_step?: ContactStep;
          opening_type?: string | null;
          objections_encountered?: string[];
          closing_technique?: string | null;
          questions_asked?: string[];
          sample_sent?: boolean;
          sample_sent_at?: string | null;
          sample_product?: string | null;
          outcome?: ContactOutcome;
          follow_up_day?: number | null;
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
