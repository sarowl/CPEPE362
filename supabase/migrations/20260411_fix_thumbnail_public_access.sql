-- =============================================================================
-- FIX: Thumbnail Display System
-- Ensures guide thumbnails stored in Autobot_Storage are publicly readable.
--
-- Root cause: The Guides/ path in Autobot_Storage may lack a public SELECT
-- policy for `anon` role, causing thumbnail URLs to return 403 for guests.
--
-- This migration is IDEMPOTENT — safe to run multiple times.
-- =============================================================================

-- 1. Make the Autobot_Storage bucket public so its objects serve without auth.
--    If your bucket is already set to public in the Supabase dashboard, this
--    is a no-op safety measure.
UPDATE storage.buckets
  SET public = true
WHERE id = 'Autobot_Storage';

-- 2. Drop and recreate all Guides/ storage policies to guarantee correct state.
--    The key fix: guides_storage_public_read must include `anon` role so that
--    unauthenticated browsers (and Next.js image requests) can load thumbnails.

DROP POLICY IF EXISTS "guides_storage_upload"       ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_owner_read"   ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "guides_insert_own"           ON storage.objects;
DROP POLICY IF EXISTS "guides_select_own"           ON storage.objects;
DROP POLICY IF EXISTS "guides_delete_own"           ON storage.objects;

-- PUBLIC READ (anon + authenticated): anyone can read files under Guides/
-- This is required for thumbnails to load in guide cards and guide view pages.
CREATE POLICY "guides_storage_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
  );

-- UPLOAD: authenticated users can upload inside their own user_id subfolder
CREATE POLICY "guides_storage_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- OWNER READ: authenticated owner can read their own files
CREATE POLICY "guides_storage_owner_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- OWNER DELETE: authenticated owner can delete files in their folder
CREATE POLICY "guides_storage_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- OWNER UPDATE: authenticated owner can replace/update files in their folder
CREATE POLICY "guides_storage_owner_update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- 3. Ensure thumbnail_url column exists on guides table (idempotent)
ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS thumbnail_url text;
