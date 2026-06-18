-- Migration: Fix ambiguous user_id column reference in has_question_access
-- Created: 2026-06-18

DROP POLICY IF EXISTS "Allow question read based on purchase or admin" ON public.questions;

DROP FUNCTION IF EXISTS public.has_question_access(text, text);

CREATE OR REPLACE FUNCTION public.has_question_access(q_topic text, requester_user_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  mock_test_id text;
  is_premium boolean := false;
  series_id text;
  exam_id text;
  raw_series_id text;
  bank_is_premium boolean := false;
  bank_exam_id text;
  bank_id text;
BEGIN
  -- 1. Check if the topic belongs to a Question Bank
  SELECT "isPremium", "examId", id INTO bank_is_premium, bank_exam_id, bank_id
  FROM public."questionBanks"
  WHERE title = q_topic AND is_archived = false
  LIMIT 1;

  IF bank_id IS NOT NULL THEN
    -- If the question bank is not premium, allow access
    IF coalesce(bank_is_premium, false) IS FALSE THEN
      RETURN true;
    END IF;

    -- If user is admin, allow access
    IF EXISTS (
      SELECT 1 FROM public.users 
      WHERE uid = requester_user_id AND role = 'admin'
    ) OR (
      auth.jwt() ->> 'email' IN ('odishaexamprep365@gmail.com', 'nareshsamal99384@gmail.com', 'nareshsamal99383@gmail.com')
    ) THEN
      RETURN true;
    END IF;

    -- Guest user cannot access premium
    IF requester_user_id IS NULL OR requester_user_id = '' THEN
      RETURN false;
    END IF;

    -- Check active purchases for this question bank, exam bundle, or full access
    RETURN EXISTS (
      SELECT 1 FROM public.user_purchases
      WHERE user_purchases.user_id = requester_user_id::uuid AND status = 'active'
      AND (
        product_id = bank_id
        OR (bank_exam_id IS NOT NULL AND product_id = 'exam_bundle_' || bank_exam_id)
        OR product_id = 'full_access'
      )
    );
  END IF;

  -- 2. Check if the topic belongs to a Mock Test
  IF NOT (q_topic LIKE 'mockTest__%') THEN
    -- If it's neither a Question Bank nor a Mock Test, default to true
    RETURN true;
  END IF;

  mock_test_id := substring(q_topic from 11); -- extract ID after 'mockTest__'

  -- Fetch the mock test row
  SELECT "seriesId" INTO raw_series_id
  FROM public."mockTests"
  WHERE id = mock_test_id AND is_archived = false;

  -- If test doesn't exist, allow read (no questions to protect)
  IF raw_series_id IS NULL THEN
    RETURN true;
  END IF;

  -- Parse raw_series_id
  IF left(raw_series_id, 1) = '{' THEN
    -- It is a inline metadata JSON string
    is_premium := (coalesce((raw_series_id::jsonb)->>'isPremium', 'false'))::boolean;
    exam_id := (raw_series_id::jsonb)->>'examId';
    series_id := NULL;
  ELSE
    -- It is a reference to a testSeries row
    series_id := raw_series_id;
    -- Fetch from testSeries
    SELECT (price > 0), "examId" INTO is_premium, exam_id
    FROM public."testSeries"
    WHERE id = series_id AND is_archived = false;
  END IF;

  -- If not premium, allow access
  IF coalesce(is_premium, false) IS FALSE THEN
    RETURN true;
  END IF;

  -- If user is admin, allow access
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = requester_user_id AND role = 'admin'
  ) OR (
    auth.jwt() ->> 'email' IN ('odishaexamprep365@gmail.com', 'nareshsamal99384@gmail.com', 'nareshsamal99383@gmail.com')
  ) THEN
    RETURN true;
  END IF;

  -- If user is guest/not authenticated, they cannot access premium questions
  IF requester_user_id IS NULL OR requester_user_id = '' THEN
    RETURN false;
  END IF;

  -- Check user purchases
  RETURN EXISTS (
    SELECT 1 FROM public.user_purchases
    WHERE user_purchases.user_id = requester_user_id::uuid AND status = 'active'
    AND (
      product_id = mock_test_id
      OR (series_id IS NOT NULL AND product_id = series_id)
      OR (exam_id IS NOT NULL AND product_id = 'exam_bundle_' || exam_id)
      OR product_id = 'full_access'
    )
  );
END;
$function$;

CREATE POLICY "Allow question read based on purchase or admin"
  ON public.questions
  FOR SELECT
  TO public
  USING (has_question_access(topic, (auth.uid())::text));
