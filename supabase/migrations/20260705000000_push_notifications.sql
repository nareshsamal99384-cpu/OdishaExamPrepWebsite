-- =============================================
-- Push Notification System
-- =============================================

-- 1. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_is_active_idx ON push_subscriptions(is_active);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to push_subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 2. Push Notifications History Table
CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT DEFAULT '/android-chrome-192x192.png',
  image_url TEXT,
  click_url TEXT DEFAULT '/',
  data JSONB DEFAULT '{}',
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'users', 'exam')),
  target_ids TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  delivery_stats JSONB DEFAULT '{"total": 0, "success": 0, "failed": 0}'
);

CREATE INDEX IF NOT EXISTS push_notifications_status_idx ON push_notifications(status);
CREATE INDEX IF NOT EXISTS push_notifications_created_at_idx ON push_notifications(created_at DESC);

ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to push_notifications"
  ON push_notifications FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_push_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_updated_at();
