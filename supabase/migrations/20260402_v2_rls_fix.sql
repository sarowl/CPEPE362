-- ================================================================
-- V2 Req #7: Replace old anon-based RLS policies with
-- authenticated-only policies as specified in the requirements.
--
-- Also adds:
--  - guide_likes table RLS fix (ensure authenticated insert works)
--  - admin_hidden_guides RLS
-
-- ================================================================

-- ── Guides: allow authenticated users to read all (for admin review)
DROP POLICY IF EXISTS "admin_select_all_guides" ON public.guides;
CREATE POLICY "admin_select_all_guides"
  ON public.guides
  FOR SELECT
  TO authenticated
  USING (true);

-- ── Guides: allow authenticated users to update (approve/reject)
DROP POLICY IF EXISTS "admin_update_guides" ON public.guides;
CREATE POLICY "admin_update_guides"
  ON public.guides
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Notifications: allow authenticated insert
DROP POLICY IF EXISTS "admin_insert_notifications" ON public.user_notifications;
CREATE POLICY "admin_insert_notifications"
  ON public.user_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── Guide rejections: allow authenticated insert
DROP POLICY IF EXISTS "admin_insert_rejections" ON public.guide_rejections;
CREATE POLICY "admin_insert_rejections"
  ON public.guide_rejections
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── Car models CRUD for authenticated (admin)
DROP POLICY IF EXISTS "admin_insert_car_models" ON public.car_models;
CREATE POLICY "admin_insert_car_models"
  ON public.car_models
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_car_models" ON public.car_models;
CREATE POLICY "admin_update_car_models"
  ON public.car_models
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_car_models" ON public.car_models;
CREATE POLICY "admin_delete_car_models"
  ON public.car_models
  FOR DELETE
  TO authenticated
  USING (true);

-- ── Car models: public read (anon + authenticated)
DROP POLICY IF EXISTS "public_select_car_models" ON public.car_models;
CREATE POLICY "public_select_car_models"
  ON public.car_models
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- ── guide_likes: ensure RLS is enabled and policies allow operations
ALTER TABLE IF EXISTS public.guide_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_guide_likes" ON public.guide_likes;
CREATE POLICY "public_select_guide_likes"
  ON public.guide_likes
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "user_insert_guide_likes" ON public.guide_likes;
CREATE POLICY "user_insert_guide_likes"
  ON public.guide_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "user_update_guide_likes" ON public.guide_likes;
CREATE POLICY "user_update_guide_likes"
  ON public.guide_likes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "user_delete_guide_likes" ON public.guide_likes;
CREATE POLICY "user_delete_guide_likes"
  ON public.guide_likes
  FOR DELETE
  TO authenticated
  USING (true);

-- ── admin_hidden_guides: allow authenticated operations
ALTER TABLE IF EXISTS public.admin_hidden_guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_hidden_guides" ON public.admin_hidden_guides;
CREATE POLICY "admin_manage_hidden_guides"
  ON public.admin_hidden_guides
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Storage: Car_Models folder structure
-- Supabase Storage does not support real folders via SQL.
-- Folders are created automatically when files are uploaded via
-- the /api/car-models-image-upload route (upsert: true).
--
-- Path format used by upload route:
--   Car_Models/<brand_id>/<slug>/img.<ext>
--
-- ACTION: In Supabase Dashboard → Storage → Autobot_Storage:
--   Create a folder named "Car_Models" if it does not exist.
--   Sub-folders (brand/model) are auto-created on first upload.
--
-- Storage bucket policies (set in Dashboard → Storage → Policies):
--   Bucket: Autobot_Storage
--   Operations: SELECT, INSERT, UPDATE, DELETE
--   Roles: authenticated
--   Path: Car_Models/**   → Allow
