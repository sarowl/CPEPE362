
DROP POLICY IF EXISTS "Car_Models public read"           ON storage.objects;
DROP POLICY IF EXISTS "car_models_storage_admin_upload"  ON storage.objects;
DROP POLICY IF EXISTS "car_models_storage_admin_update"  ON storage.objects;
DROP POLICY IF EXISTS "car_models_storage_admin_delete"  ON storage.objects;

-- Public read: anyone can view car model images
CREATE POLICY "Car_Models public read"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Car_Models'
  );

-- Authenticated insert: admins can upload to Car_Models/
CREATE POLICY "car_models_storage_admin_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Car_Models'
  );

-- Authenticated update: admins can replace images
CREATE POLICY "car_models_storage_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Car_Models'
  );

-- Authenticated delete: admins can remove images / manage folders
CREATE POLICY "car_models_storage_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'Autobot_Storage'
    AND (storage.foldername(name))[1] = 'Car_Models'
  );

-- ── 2. DB function: create placeholder .keep file via HTTP ────────
-- NOTE: Folder creation (uploading the .keep placeholder) is handled
-- by the Next.js API route /api/car-models-storage-sync using the
-- Supabase Admin client, which bypasses RLS. No DB trigger is needed
-- for storage folder creation because storage.objects is managed
-- through the storage API, not direct DB inserts from triggers.
--
-- However, we create a lightweight trigger function that logs when a
-- new car model is added, as a hook for future automation if needed.

CREATE OR REPLACE FUNCTION notify_car_model_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify channel so connected clients (e.g. admin page) can react
  PERFORM pg_notify(
    'car_model_added',
    json_build_object('id', NEW.id, 'brand_id', NEW.brand_id, 'name', NEW.name)::text
  );
  RETURN NEW;
END;
$$;

-- Drop existing trigger if present before recreating
DROP TRIGGER IF EXISTS trg_car_model_added ON car_models;

CREATE TRIGGER trg_car_model_added
  AFTER INSERT ON car_models
  FOR EACH ROW
  EXECUTE FUNCTION notify_car_model_added();
