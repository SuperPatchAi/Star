-- Add onboarding tracking columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step text NOT NULL DEFAULT 'carousel'
    CHECK (onboarding_step IN ('carousel', 'tour', 'checklist', 'completed')),
  ADD COLUMN IF NOT EXISTS onboarding_checklist jsonb NOT NULL DEFAULT '{
    "add_first_contact": false,
    "start_first_conversation": false,
    "complete_sales_step": false,
    "send_first_sample": false,
    "setup_followup": false
  }'::jsonb;

-- Mark all existing users as completed so they skip onboarding
UPDATE user_profiles SET onboarding_step = 'completed';
