ALTER TABLE public."User_cars"
ADD COLUMN IF NOT EXISTS classification text;

UPDATE public."User_cars"
SET classification = 'private'
WHERE classification IS NULL
  OR classification NOT IN ('private', 'electric', 'public', 'government');

ALTER TABLE public."User_cars"
ALTER COLUMN classification SET DEFAULT 'private';

ALTER TABLE public."User_cars"
ALTER COLUMN classification SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_cars_classification_check'
  ) THEN
    ALTER TABLE public."User_cars"
    ADD CONSTRAINT user_cars_classification_check
    CHECK (classification IN ('private', 'electric', 'public', 'government'));
  END IF;
END $$;
