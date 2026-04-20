-- Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function: create renewal alerts for subs renewing within 3 days
CREATE OR REPLACE FUNCTION public.generate_renewal_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT s.id, s.user_id, s.name, s.price, s.next_billing_date,
           (s.next_billing_date - CURRENT_DATE) AS days_left
    FROM public.subscriptions s
    WHERE s.status IN ('active','at_risk','trial')
      AND s.next_billing_date IS NOT NULL
      AND s.next_billing_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 day')
  LOOP
    -- Skip if we already have an unread renewal alert for this sub in last 4 days
    IF NOT EXISTS (
      SELECT 1 FROM public.alerts a
      WHERE a.subscription_id = r.id
        AND a.type = 'renewal'
        AND a.created_at > now() - INTERVAL '4 day'
    ) THEN
      INSERT INTO public.alerts(user_id, subscription_id, type, severity, title, message)
      VALUES (
        r.user_id, r.id, 'renewal',
        CASE WHEN r.days_left <= 1 THEN 'warning'::alert_severity ELSE 'info'::alert_severity END,
        r.name || ' renews in ' || r.days_left || ' day' || CASE WHEN r.days_left = 1 THEN '' ELSE 's' END,
        'Upcoming charge of ' || r.price || ' on ' || to_char(r.next_billing_date, 'Mon DD, YYYY') || '.'
      );
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  RETURN inserted_count;
END;
$$;

-- Schedule it daily at 08:00 UTC (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('subtrak-daily-renewal-alerts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'subtrak-daily-renewal-alerts',
  '0 8 * * *',
  $$ SELECT public.generate_renewal_alerts(); $$
);