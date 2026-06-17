-- Migration: Setup RLS policies on attempts table
-- Created: 2026-06-15

-- 1. Ensure RLS is enabled
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users insert own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Allow users read own attempts" ON public.attempts;

-- 3. Create policies
CREATE POLICY "Allow users insert own attempts"
  ON public.attempts
  FOR INSERT
  WITH CHECK (
    (auth.uid()::text = "userId")
  );

CREATE POLICY "Allow users read own attempts"
  ON public.attempts
  FOR SELECT
  USING (
    (auth.uid()::text = "userId")
    OR auth.jwt() ->> 'email' IN ('nareshsamal99384@gmail.com', 'odishaexamprep365@gmail.com', 'nareshsamal99383@gmail.com')
    OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
  );
