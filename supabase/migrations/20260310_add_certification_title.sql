-- Add title column to Certification table if it doesn't exist
ALTER TABLE "public"."Certification" 
ADD COLUMN IF NOT EXISTS "title" TEXT;

-- Add default value for existing rows
UPDATE "public"."Certification" 
SET "title" = 'Untitled Certification' 
WHERE "title" IS NULL;
