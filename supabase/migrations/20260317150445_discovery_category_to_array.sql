-- Convert discovery_category from text to text[] for multi-select support
ALTER TABLE d2c_contacts
  ALTER COLUMN discovery_category TYPE text[]
  USING CASE
    WHEN discovery_category IS NOT NULL THEN ARRAY[discovery_category]
    ELSE '{}'::text[]
  END;

ALTER TABLE d2c_contacts
  ALTER COLUMN discovery_category SET DEFAULT '{}';
