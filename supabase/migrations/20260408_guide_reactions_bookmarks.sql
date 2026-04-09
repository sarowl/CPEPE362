ALTER TABLE IF EXISTS public.guide_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "public_select_guide_reactions" ON public.guide_reactions;
DROP POLICY IF EXISTS "user_insert_guide_reactions"   ON public.guide_reactions;
DROP POLICY IF EXISTS "user_update_guide_reactions"   ON public.guide_reactions;
DROP POLICY IF EXISTS "user_delete_guide_reactions"   ON public.guide_reactions;

-- Anyone can read reaction counts (for bookmark counts if needed)
CREATE POLICY "public_select_guide_reactions"
  ON public.guide_reactions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can insert their own bookmarks
CREATE POLICY "user_insert_guide_reactions"
  ON public.guide_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own bookmarks
CREATE POLICY "user_update_guide_reactions"
  ON public.guide_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete (un-bookmark) their own entries
CREATE POLICY "user_delete_guide_reactions"
  ON public.guide_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Also allow anon (service-role fallback) for admin operations
DROP POLICY IF EXISTS "admin_manage_guide_reactions" ON public.guide_reactions;
CREATE POLICY "admin_manage_guide_reactions"
  ON public.guide_reactions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
