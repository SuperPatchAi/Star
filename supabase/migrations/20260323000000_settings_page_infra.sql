-- =============================================================
-- Settings Page Infrastructure
-- 1. Add notification_preferences column to user_profiles
-- 2. Create avatars storage bucket with RLS policies
-- =============================================================

-- 1. notification_preferences JSONB column
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb
  NOT NULL DEFAULT '{
    "follow_up_reminders": true,
    "overdue_alerts": true,
    "sample_check_ins": true
  }'::jsonb;

-- 2. Avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatar images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
