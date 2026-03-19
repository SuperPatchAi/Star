-- Add columns for tracking in-progress coaching skill state
ALTER TABLE public.d2c_coaching_progress
  ADD COLUMN IF NOT EXISTS current_skill TEXT,
  ADD COLUMN IF NOT EXISTS current_question_index INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_questions INT DEFAULT 0;

COMMENT ON COLUMN public.d2c_coaching_progress.current_skill IS 'ID of the skill currently in progress (NULL when no active skill)';
COMMENT ON COLUMN public.d2c_coaching_progress.current_question_index IS 'Zero-based index of the last answered question in the active skill';
COMMENT ON COLUMN public.d2c_coaching_progress.total_questions IS 'Total number of questions in the active skill';
