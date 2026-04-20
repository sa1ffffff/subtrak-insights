-- Set search_path on missing function
CREATE OR REPLACE FUNCTION public.monthly_cost(_price NUMERIC, _cycle billing_cycle)
RETURNS NUMERIC LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT CASE _cycle
    WHEN 'monthly' THEN _price
    WHEN 'yearly' THEN _price/12.0
    WHEN 'weekly' THEN _price*52.0/12.0
    WHEN 'quarterly' THEN _price/3.0
  END
$$;

-- Switch all views to security_invoker so RLS of querying user is enforced
ALTER VIEW public.active_subscriptions SET (security_invoker = true);
ALTER VIEW public.monthly_spending_summary SET (security_invoker = true);
ALTER VIEW public.category_breakdown SET (security_invoker = true);
ALTER VIEW public.dashboard_overview SET (security_invoker = true);
ALTER VIEW public.wasteful_subscriptions SET (security_invoker = true);