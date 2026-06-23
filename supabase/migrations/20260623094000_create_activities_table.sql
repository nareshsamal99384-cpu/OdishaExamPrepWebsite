-- Migration: Create activities table for real-time synchronization
-- Created: 2026-06-23

-- 1. Create public.activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  score numeric,
  "totalMarks" numeric,
  accuracy numeric,
  "timeSpent" numeric,
  metadata jsonb
);

-- 2. Enable RLS on the activities table
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for public.activities
DROP POLICY IF EXISTS "Allow users insert own activities" ON public.activities;
CREATE POLICY "Allow users insert own activities"
  ON public.activities
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = "userId"
  );

DROP POLICY IF EXISTS "Allow users read own activities" ON public.activities;
CREATE POLICY "Allow users read own activities"
  ON public.activities
  FOR SELECT
  USING (
    auth.uid()::text = "userId"
    OR auth.jwt() ->> 'email' IN ('nareshsamal99384@gmail.com', 'odishaexamprep365@gmail.com', 'nareshsamal99383@gmail.com')
    OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
  );

DROP POLICY IF EXISTS "Allow users update own activities" ON public.activities;
CREATE POLICY "Allow users update own activities"
  ON public.activities
  FOR UPDATE
  USING (
    auth.uid()::text = "userId"
  )
  WITH CHECK (
    auth.uid()::text = "userId"
  );

DROP POLICY IF EXISTS "Allow users delete own activities" ON public.activities;
CREATE POLICY "Allow users delete own activities"
  ON public.activities
  FOR DELETE
  USING (
    auth.uid()::text = "userId"
  );

-- 4. Enable Realtime for activities table by adding it to supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
  END IF;
END $$;

-- 5. Copy completed attempts from attempts table to activities table
INSERT INTO public.activities (id, "userId", type, title, timestamp, score, "totalMarks", accuracy, metadata)
SELECT 
  a.id,
  a."userId",
  CASE 
    WHEN a."testId" LIKE 'practice-%' THEN 'practice_test_completed'::text
    ELSE 'mock_test_completed'::text
  END as type,
  COALESCE(
    (SELECT title FROM public."mockTests" WHERE id = a."testId" LIMIT 1),
    'Practice Test'
  ) as title,
  a."completedAt" as timestamp,
  a.score,
  100 as "totalMarks",
  a.accuracy,
  jsonb_build_object(
    'answers', a.answers, 
    'test', jsonb_build_object('id', a."testId")
  ) as metadata
FROM public.attempts a
ON CONFLICT (id) DO NOTHING;
