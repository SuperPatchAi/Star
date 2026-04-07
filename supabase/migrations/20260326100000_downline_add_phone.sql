-- Add phone column to d2c_downline_cache for storing rep contact info from ByDesign
ALTER TABLE public.d2c_downline_cache ADD COLUMN IF NOT EXISTS phone text;
