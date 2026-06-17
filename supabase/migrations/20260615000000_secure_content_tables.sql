-- Migration: Secure content tables with Row Level Security (RLS)
-- Created: 2026-06-15

-- 1. Enable RLS on content tables
ALTER TABLE public."mockTests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Select mockTests with access control" ON public."mockTests";
DROP POLICY IF EXISTS "Admins have full write access to mockTests" ON public."mockTests";
DROP POLICY IF EXISTS "Select questions with access control" ON public.questions;
DROP POLICY IF EXISTS "Admins have full write access to questions" ON public.questions;

-- 3. Create SELECT policies for mockTests
CREATE POLICY "Select mockTests with access control"
  ON public."mockTests"
  FOR SELECT
  USING (
    -- Case A: Test is free (not premium)
    (
      NOT (seriesId LIKE '{"isPremium":true%')
      AND NOT (seriesId LIKE '%"isPremium":true%')
    )
    -- Case B: Requester is an Admin
    OR auth.jwt() ->> 'email' IN ('nareshsamal99384@gmail.com', 'odishaexamprep365@gmail.com', 'nareshsamal99383@gmail.com')
    OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
    -- Case C: Requester purchased the mock test directly, parent test series, parent exam bundle, or has full access
    OR EXISTS (
      SELECT 1 FROM public.user_purchases
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND (
          product_id = "mockTests".id
          OR product_id = 'full_access'
          OR product_id = "mockTests".seriesId
          OR (
            product_id = 'exam_bundle_' || (
              CASE 
                WHEN "mockTests".seriesId LIKE '%"examId":"%' 
                THEN substring("mockTests".seriesId from '"examId":"([^"]+)"')
                ELSE (SELECT "examId" FROM public."testSeries" WHERE id = "mockTests".seriesId LIMIT 1)
              END
            )
          )
        )
    )
  );

-- 4. Create WRITE policies for mockTests (Admins only)
CREATE POLICY "Admins have full write access to mockTests"
  ON public."mockTests"
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('nareshsamal99384@gmail.com', 'odishaexamprep365@gmail.com', 'nareshsamal99383@gmail.com')
    OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
  );

-- 5. Create SELECT policies for questions
CREATE POLICY "Select questions with access control"
  ON public.questions
  FOR SELECT
  USING (
    -- Case A: Requester is an Admin
    auth.jwt() ->> 'email' IN ('nareshsamal99384@gmail.com', 'odishaexamprep365@gmail.com', 'nareshsamal99383@gmail.com')
    OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
    -- Case B: User has active purchase for this exam bundle, full access, or the specific mock test
    OR EXISTS (
      SELECT 1 FROM public.user_purchases
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND (
          product_id = 'exam_bundle_' || questions."examId"
          OR product_id = 'full_access'
          OR (
            questions.topic LIKE 'mockTest__%'
            AND (
              product_id = substring(questions.topic from 11)
              OR product_id = (
                SELECT seriesId FROM public."mockTests" WHERE id = substring(questions.topic from 11) LIMIT 1
              )
              OR product_id = 'exam_bundle_' || (
                SELECT 
                  CASE 
                    WHEN seriesId LIKE '%"examId":"%' 
                    THEN substring(seriesId from '"examId":"([^"]+)"')
                    ELSE (SELECT "examId" FROM public."testSeries" WHERE id = mt.seriesId LIMIT 1)
                  END
                FROM public."mockTests" mt WHERE id = substring(questions.topic from 11) LIMIT 1
              )
            )
          )
        )
    )
    -- Case C: Question belongs to a free mock test
    OR (
      questions.topic LIKE 'mockTest__%'
      AND EXISTS (
        SELECT 1 FROM public."mockTests"
        WHERE id = substring(questions.topic from 11)
          AND NOT (seriesId LIKE '{"isPremium":true%')
          AND NOT (seriesId LIKE '%"isPremium":true%')
      )
    )
    -- Case D: General exam question and the parent exam is free (not premium)
    OR (
      NOT (questions.topic LIKE 'mockTest__%')
      AND NOT EXISTS (
        SELECT 1 FROM public.exams 
        WHERE id = questions."examId" 
          AND description LIKE 'JSON_METADATA_%'
      )
    )
  );

-- 6. Create WRITE policies for questions (Admins only)
CREATE POLICY "Admins have full write access to questions"
  ON public.questions
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('nareshsamal99384@gmail.com', 'odishaexamprep365@gmail.com', 'nareshsamal99383@gmail.com')
    OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
  );
