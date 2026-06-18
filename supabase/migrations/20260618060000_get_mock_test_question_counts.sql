-- Migration: Add RPC helper to get mock test question counts bypassing RLS
-- Created: 2026-06-18

CREATE OR REPLACE FUNCTION public.get_mock_test_question_counts()
RETURNS TABLE(mock_test_id text, question_count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    substring(topic from 11) as mock_test_id,
    count(*)::bigint as question_count
  FROM public.questions
  WHERE topic LIKE 'mockTest__%'
  GROUP BY topic;
$$;
