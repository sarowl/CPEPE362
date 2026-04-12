-- 1. Ensure thumbnail_url column exists in guides (idempotent)
ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- 2. Re-apply storage RLS policies for full subfolder access
--    (covers thumbnail/ and step_N/ subfolders in new structure)

DROP POLICY IF EXISTS "guides_storage_upload"       ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_owner_read"   ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_owner_update" ON storage.objects;

-- Allow authenticated users to upload to their own folder (all subpaths)
CREATE POLICY "guides_storage_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- Owner can read their own files (all subpaths including thumbnail/, step_N/)
CREATE POLICY "guides_storage_owner_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- Public read: anyone can read any file under Guides/ (for approved guide images)
CREATE POLICY "guides_storage_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
  );

-- Owner can delete files in their folder
CREATE POLICY "guides_storage_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- Owner can update/replace files in their folder
CREATE POLICY "guides_storage_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
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
