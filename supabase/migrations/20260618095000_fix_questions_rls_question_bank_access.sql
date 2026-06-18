-- Migration: Fix question RLS to also allow access when user has purchased the
-- specific questionBank whose title matches the question's topic field.
-- Problem: The existing "Case D" only allows free exam questions. Premium exams
-- (those with JSON_METADATA_ description) were blocking ALL their practice
-- questions from the anon client, even for users who purchased a question bank
-- within that exam.
-- Fix: Add Case E - allow access when the user has an active purchase for the
-- specific question bank whose title matches the question's topic.
-- Created: 2026-06-18

-- Drop the existing questions SELECT policy
DROP POLICY IF EXISTS "Select questions with access control" ON public.questions;

-- Re-create it with the new Case E added
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
                    WHEN seriesId LIKE '%"examId":"%" 
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

    -- Case E (NEW): User has purchased the specific question bank whose title
    -- matches this question's topic. This enables premium exam questions
    -- to be accessible when the user unlocks an individual question bank.
    OR (
      NOT (questions.topic LIKE 'mockTest__%')
      AND EXISTS (
        SELECT 1 FROM public."questionBanks" qb
        JOIN public.user_purchases up ON up.product_id = qb.id
        WHERE up.user_id = auth.uid()
          AND up.status = 'active'
          AND qb."examId" = questions."examId"
          AND qb.title = questions.topic
      )
    )
  );
