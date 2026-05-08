-- V72 — Web Push subscriptions (VAPID).
-- Une ligne par device/browser. RLS : chaque user gère ses propres souscriptions.
-- Edge Function `send-push` utilise le service_role (bypass RLS).

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user
  ON public.push_subscriptions(user_id) WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_push_subs_farm
  ON public.push_subscriptions(farm_id) WHERE enabled = TRUE;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage their own subs" ON public.push_subscriptions;
CREATE POLICY "users manage their own subs" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_push_subs_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_subs_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subs_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_push_subs_touch_updated_at();

COMMENT ON TABLE public.push_subscriptions IS 'V72 — Web Push subscriptions (VAPID). Une ligne par device/browser.';
