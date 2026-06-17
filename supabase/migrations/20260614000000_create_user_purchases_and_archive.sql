-- Migration: Create user_purchases and add is_archived columns
-- Created: 2026-06-14

-- Create user_purchases table
CREATE TABLE IF NOT EXISTS public.user_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  product_type TEXT NOT NULL,
  price_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  snapshot JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and create
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.user_purchases;
CREATE POLICY "Users can view their own purchases"
  ON public.user_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Drop admin policy if exists and create
DROP POLICY IF EXISTS "Admins have full access" ON public.user_purchases;
CREATE POLICY "Admins have full access"
  ON public.user_purchases
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('nareshsamal99384@gmail.com', 'odishaexamprep365@gmail.com', 'nareshsamal99383@gmail.com')
    OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
  );

-- Add is_archived columns to catalog tables
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public."testSeries" ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public."mockTests" ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public."questionBanks" ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
