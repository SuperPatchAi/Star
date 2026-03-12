-- Add stage_entered_at to track when a contact entered their current kanban stage.
-- Used by the follow-up reminder system to compute staleness and DAY-sequence timing.
ALTER TABLE public.d2c_contacts
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz DEFAULT now();

-- Backfill existing contacts: use updated_at as a reasonable approximation
UPDATE public.d2c_contacts
  SET stage_entered_at = updated_at
  WHERE stage_entered_at IS NULL;

-- Index for efficient reminder queries (stage + entry time)
CREATE INDEX IF NOT EXISTS idx_d2c_contacts_stage_entered
  ON public.d2c_contacts(current_step, stage_entered_at);
