-- =============================================================
-- SuperPatch S.T.A.R. D2C — Consolidated Schema
-- Tables: user_profiles, d2c_contacts, d2c_push_subscriptions
-- Idempotent: safe to re-run on partial state
-- =============================================================

-- Clean slate: drop any partially-created objects
DROP TABLE IF EXISTS public.d2c_push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.d2c_contacts CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;


-- 1. user_profiles
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  onboarding_step text NOT NULL DEFAULT 'carousel',
  onboarding_checklist jsonb NOT NULL DEFAULT '{
    "add_first_contact": false,
    "start_first_conversation": false,
    "complete_sales_step": false,
    "send_first_sample": false,
    "setup_followup": false
  }'::jsonb,
  store_subdomain text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- 2. d2c_contacts
CREATE TABLE public.d2c_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_ids text[] NOT NULL DEFAULT '{}',
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  address_city text,
  address_state text,
  address_zip text,
  notes text,
  current_step text NOT NULL DEFAULT 'add_contact',
  opening_types jsonb DEFAULT '{}'::jsonb,
  objections_encountered jsonb DEFAULT '{}'::jsonb,
  closing_techniques jsonb DEFAULT '{}'::jsonb,
  questions_asked jsonb DEFAULT '{}'::jsonb,
  sample_sent boolean NOT NULL DEFAULT false,
  sample_sent_at timestamptz,
  sample_products text[] DEFAULT '{}',
  sample_followup_done boolean NOT NULL DEFAULT false,
  outcome text DEFAULT 'pending',
  follow_up_day integer,
  peak_step text,
  stage_entered_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.d2c_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own d2c_contacts"
  ON public.d2c_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own d2c_contacts"
  ON public.d2c_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own d2c_contacts"
  ON public.d2c_contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own d2c_contacts"
  ON public.d2c_contacts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_d2c_contacts_user_id ON public.d2c_contacts(user_id);
CREATE INDEX idx_d2c_contacts_product_ids ON public.d2c_contacts USING gin(product_ids);
CREATE INDEX idx_d2c_contacts_outcome ON public.d2c_contacts(outcome);
CREATE INDEX idx_d2c_contacts_current_step ON public.d2c_contacts(current_step);
CREATE INDEX idx_d2c_contacts_stage_entered ON public.d2c_contacts(current_step, stage_entered_at);


-- 3. d2c_push_subscriptions
CREATE TABLE public.d2c_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.d2c_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push subscriptions"
  ON public.d2c_push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON public.d2c_push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.d2c_push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_d2c_push_subscriptions_user_id
  ON public.d2c_push_subscriptions(user_id);
