-- =============================================================
-- Team Dashboard + ByDesign Integration Schema
-- Tables: d2c_downline_cache, d2c_team_members, d2c_purchase_matches
-- Columns: bydesign fields on user_profiles and d2c_contacts
-- Extensions: pgcrypto for credential encryption
-- =============================================================

-- Enable pgcrypto for symmetric encryption of ByDesign API credentials
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Helper RPCs for pgcrypto encrypt/decrypt from server actions
CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_text(plain_text text, encryption_key text)
RETURNS bytea
LANGUAGE sql
SECURITY DEFINER
SET search_path = extensions, public
AS $$ SELECT pgp_sym_encrypt(plain_text, encryption_key); $$;

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_text(encrypted_data bytea, encryption_key text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = extensions, public
AS $$ SELECT pgp_sym_decrypt(encrypted_data, encryption_key); $$;

REVOKE EXECUTE ON FUNCTION public.pgp_sym_encrypt_text(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pgp_sym_encrypt_text(text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.pgp_sym_decrypt_text(bytea, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pgp_sym_decrypt_text(bytea, text) TO service_role;

-- -------------------------------------------------------
-- 1. user_profiles: add ByDesign integration columns
-- -------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS bydesign_rep_did text,
  ADD COLUMN IF NOT EXISTS bydesign_api_username text,
  ADD COLUMN IF NOT EXISTS bydesign_api_key_encrypted bytea,
  ADD COLUMN IF NOT EXISTS bydesign_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS bydesign_rank text;

CREATE INDEX IF NOT EXISTS idx_user_profiles_rep_did
  ON public.user_profiles(bydesign_rep_did)
  WHERE bydesign_rep_did IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_store_subdomain
  ON public.user_profiles(store_subdomain)
  WHERE store_subdomain IS NOT NULL;

-- -------------------------------------------------------
-- 2. d2c_downline_cache: full ByDesign downline per leader
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.d2c_downline_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rep_did text NOT NULL,
  rep_name text,
  email text,
  rank text,
  rank_type_id integer,
  level integer,
  pv decimal(10,2) DEFAULT 0,
  gv decimal(10,2) DEFAULT 0,
  join_date timestamptz,
  has_autoship boolean DEFAULT false,
  rep_status text,
  star_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_token text UNIQUE,
  invite_status text NOT NULL DEFAULT 'not_invited',
  invited_at timestamptz,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(leader_id, rep_did)
);

ALTER TABLE public.d2c_downline_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view their own downline cache"
  ON public.d2c_downline_cache FOR SELECT
  USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can insert into their own downline cache"
  ON public.d2c_downline_cache FOR INSERT
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update their own downline cache"
  ON public.d2c_downline_cache FOR UPDATE
  USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can delete from their own downline cache"
  ON public.d2c_downline_cache FOR DELETE
  USING (auth.uid() = leader_id);

CREATE INDEX IF NOT EXISTS idx_downline_cache_leader_id
  ON public.d2c_downline_cache(leader_id);

CREATE INDEX IF NOT EXISTS idx_downline_cache_invite_token
  ON public.d2c_downline_cache(invite_token)
  WHERE invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_downline_cache_star_user_id
  ON public.d2c_downline_cache(star_user_id)
  WHERE star_user_id IS NOT NULL;

-- -------------------------------------------------------
-- 3. d2c_team_members: linked S.T.A.R. team members
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.d2c_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_rep_did text,
  level integer,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(leader_id, member_id)
);

ALTER TABLE public.d2c_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view their own team members"
  ON public.d2c_team_members FOR SELECT
  USING (auth.uid() = leader_id);

CREATE POLICY "Members can view their own membership"
  ON public.d2c_team_members FOR SELECT
  USING (auth.uid() = member_id);

CREATE POLICY "Leaders can insert team members"
  ON public.d2c_team_members FOR INSERT
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update their team members"
  ON public.d2c_team_members FOR UPDATE
  USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can delete team members"
  ON public.d2c_team_members FOR DELETE
  USING (auth.uid() = leader_id);

CREATE INDEX IF NOT EXISTS idx_team_members_leader_id
  ON public.d2c_team_members(leader_id);

CREATE INDEX IF NOT EXISTS idx_team_members_member_id
  ON public.d2c_team_members(member_id);

-- -------------------------------------------------------
-- 4. d2c_contacts: add ByDesign reconciliation columns
-- -------------------------------------------------------
ALTER TABLE public.d2c_contacts
  ADD COLUMN IF NOT EXISTS bydesign_customer_did text,
  ADD COLUMN IF NOT EXISTS bydesign_matched_at timestamptz,
  ADD COLUMN IF NOT EXISTS bydesign_match_confidence text,
  ADD COLUMN IF NOT EXISTS bydesign_order_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bydesign_total_spent decimal(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_d2c_contacts_bydesign_customer
  ON public.d2c_contacts(bydesign_customer_did)
  WHERE bydesign_customer_did IS NOT NULL;

-- -------------------------------------------------------
-- 5. d2c_purchase_matches: matched ByDesign orders
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.d2c_purchase_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.d2c_contacts(id) ON DELETE CASCADE,
  bydesign_customer_did text NOT NULL,
  bydesign_order_id integer NOT NULL,
  order_date timestamptz,
  order_total decimal(10,2),
  order_status_id integer,
  products_purchased jsonb DEFAULT '[]'::jsonb,
  matched_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, bydesign_order_id)
);

ALTER TABLE public.d2c_purchase_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchase matches"
  ON public.d2c_purchase_matches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchase matches"
  ON public.d2c_purchase_matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase matches"
  ON public.d2c_purchase_matches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchase matches"
  ON public.d2c_purchase_matches FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_purchase_matches_user_id
  ON public.d2c_purchase_matches(user_id);

CREATE INDEX IF NOT EXISTS idx_purchase_matches_contact_id
  ON public.d2c_purchase_matches(contact_id);
