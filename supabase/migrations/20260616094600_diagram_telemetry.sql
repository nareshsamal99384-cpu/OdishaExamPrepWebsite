-- Create diagram_telemetry table for logging render and parsing failures
CREATE TABLE IF NOT EXISTS public.diagram_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  diagram_data JSONB,
  user_agent TEXT,
  referrer_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagram_telemetry ENABLE ROW LEVEL SECURITY;

-- Allow anonymous or authenticated inserts
CREATE POLICY "Allow anonymous inserts" 
ON public.diagram_telemetry 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Allow authenticated users to view logs
CREATE POLICY "Allow authenticated users to read" 
ON public.diagram_telemetry 
FOR SELECT 
TO authenticated 
USING (true);
