-- Add discovery and follow-up rating columns for simplified 6-step sales flow
ALTER TABLE d2c_contacts
  ADD COLUMN IF NOT EXISTS discovery_category text,
  ADD COLUMN IF NOT EXISTS discovery_quality_rating integer,
  ADD COLUMN IF NOT EXISTS discovery_duration text,
  ADD COLUMN IF NOT EXISTS discovery_tried_before text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS discovery_tried_result text,
  ADD COLUMN IF NOT EXISTS followup_ratings jsonb DEFAULT '{}';
