ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- 2. Re-apply storage RLS policies (idempotent drop + recreate)
-- These apply to ALL paths under Guides/ including new subfolders.

DROP POLICY IF EXISTS "guides_storage_upload"       ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_owner_read"   ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "guides_storage_owner_update" ON storage.objects;

-- UPLOAD: authenticated users can upload inside their own user_id folder
CREATE POLICY "guides_storage_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- OWN READ: owner can read their own guide files
CREATE POLICY "guides_storage_owner_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- PUBLIC READ: anyone can read files in the Guides/ prefix
CREATE POLICY "guides_storage_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
  );

-- DELETE: owner can delete files in their folder
CREATE POLICY "guides_storage_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Guides'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- UPDATE: owner can update/replace files
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
