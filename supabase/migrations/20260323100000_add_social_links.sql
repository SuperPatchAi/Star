-- Add social_links JSONB column to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;
