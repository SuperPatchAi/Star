-- =============================================================
-- S.T.A.R. Unified Agent — New Tables
-- Tables: star_embeddings, d2c_coaching_progress
-- Extension: pgvector
-- =============================================================

-- 1. Enable pgvector extension for embedding similarity search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. star_embeddings — stores chunked embeddings for RAG (sales + coaching)
CREATE TABLE public.star_embeddings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  domain TEXT NOT NULL,
  content_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  section_key TEXT,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding extensions.vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_star_embeddings_domain ON public.star_embeddings(domain);
CREATE INDEX idx_star_embeddings_source ON public.star_embeddings(source_id);
CREATE INDEX idx_star_embeddings_hnsw ON public.star_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);

COMMENT ON TABLE public.star_embeddings IS 'RAG embeddings for sales roadmap specs and coaching worksheets. Public reference data — no RLS needed.';
COMMENT ON COLUMN public.star_embeddings.domain IS 'sales | coaching';
COMMENT ON COLUMN public.star_embeddings.content_type IS 'sales: opening, discovery, objection, closing, followup, product. coaching: worksheet_question, framework, scoring_rubric, case_study';
COMMENT ON COLUMN public.star_embeddings.source_id IS 'product_id (sales) or skill_id (coaching)';

-- 3. d2c_coaching_progress — persists coaching progress across chat threads
CREATE TABLE public.d2c_coaching_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program TEXT NOT NULL,
  completed_skills TEXT[] DEFAULT '{}',
  skill_outputs JSONB DEFAULT '{}'::jsonb,
  current_phase INT DEFAULT 1,
  current_week INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, program)
);

ALTER TABLE public.d2c_coaching_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own coaching progress"
  ON public.d2c_coaching_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coaching progress"
  ON public.d2c_coaching_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaching progress"
  ON public.d2c_coaching_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_d2c_coaching_progress_user ON public.d2c_coaching_progress(user_id);
CREATE INDEX idx_d2c_coaching_progress_program ON public.d2c_coaching_progress(user_id, program);

COMMENT ON TABLE public.d2c_coaching_progress IS 'Coaching program progress per user per program (100m_blueprint | global_leaders). One row per user per program.';
COMMENT ON COLUMN public.d2c_coaching_progress.program IS '100m_blueprint | global_leaders';
COMMENT ON COLUMN public.d2c_coaching_progress.skill_outputs IS 'skill_id -> {answers, scores, actions, completed_at}';
