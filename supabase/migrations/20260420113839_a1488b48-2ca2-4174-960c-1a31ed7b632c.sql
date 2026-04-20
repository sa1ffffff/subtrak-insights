-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly', 'weekly', 'quarterly');
CREATE TYPE public.subscription_status AS ENUM ('active', 'paused', 'cancelled', 'trial', 'at_risk');
CREATE TYPE public.payment_status AS ENUM ('paid', 'failed', 'pending', 'refunded');
CREATE TYPE public.alert_type AS ENUM ('renewal', 'overspending', 'failed_payment', 'waste', 'budget_warning');
CREATE TYPE public.alert_severity AS ENUM ('info', 'warning', 'critical');

-- =========================================================
-- USER ROLES (separate table — security)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  monthly_income NUMERIC(12,2) DEFAULT 0 CHECK (monthly_income >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- CATEGORIES (global)
-- =========================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable by all auth" ON public.categories FOR SELECT TO authenticated USING (true);

-- =========================================================
-- SERVICES (global directory)
-- =========================================================
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  logo_url TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services readable by all auth" ON public.services FOR SELECT TO authenticated USING (true);

-- =========================================================
-- SUBSCRIPTIONS
-- =========================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date DATE,
  status subscription_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- one active subscription per user per service
CREATE UNIQUE INDEX uniq_active_sub_per_service
  ON public.subscriptions(user_id, service_id)
  WHERE status = 'active' AND service_id IS NOT NULL;
CREATE INDEX idx_sub_user ON public.subscriptions(user_id);
CREATE INDEX idx_sub_status ON public.subscriptions(status);
CREATE POLICY "users own subs select" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users own subs insert" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users own subs update" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users own subs delete" ON public.subscriptions FOR DELETE USING (auth.uid() = user_id);

-- =========================================================
-- PAYMENTS
-- =========================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status payment_status NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pay_user_date ON public.payments(user_id, payment_date DESC);
CREATE INDEX idx_pay_sub ON public.payments(subscription_id);
CREATE POLICY "users own pay select" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users own pay insert" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users own pay update" ON public.payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users own pay delete" ON public.payments FOR DELETE USING (auth.uid() = user_id);

-- =========================================================
-- BUDGETS
-- =========================================================
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_limit NUMERIC(12,2) NOT NULL CHECK (monthly_limit >= 0),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX uniq_active_budget_per_user ON public.budgets(user_id) WHERE is_active = true;
CREATE POLICY "users own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- ALERTS
-- =========================================================
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alerts_user ON public.alerts(user_id, created_at DESC);
CREATE POLICY "users own alerts select" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users own alerts update" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users own alerts delete" ON public.alerts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "users own alerts insert" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- USAGE LOGS
-- =========================================================
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  used_at DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes_used INTEGER DEFAULT 0 CHECK (minutes_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_usage_sub ON public.usage_logs(subscription_id, used_at DESC);
CREATE POLICY "users own usage" ON public.usage_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- SUBSCRIPTION HISTORY
-- =========================================================
CREATE TABLE public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_status subscription_status,
  new_status subscription_status,
  old_price NUMERIC(10,2),
  new_price NUMERIC(10,2),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own history" ON public.subscription_history FOR SELECT USING (auth.uid() = user_id);

-- =========================================================
-- AUDIT LOGS
-- =========================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  record_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own audit" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

-- =========================================================
-- BILLING EVENTS (renewals queue/log)
-- =========================================================
CREATE TABLE public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_for DATE NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own billing events" ON public.billing_events FOR SELECT USING (auth.uid() = user_id);

-- =========================================================
-- TIMESTAMP UPDATER
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_subs_touch BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- BILLING ENGINE
-- =========================================================
CREATE OR REPLACE FUNCTION public.calculate_next_billing(_start DATE, _cycle billing_cycle)
RETURNS DATE LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  _next DATE := _start;
BEGIN
  IF _cycle = 'monthly' THEN
    WHILE _next <= CURRENT_DATE LOOP _next := _next + INTERVAL '1 month'; END LOOP;
  ELSIF _cycle = 'yearly' THEN
    WHILE _next <= CURRENT_DATE LOOP _next := _next + INTERVAL '1 year'; END LOOP;
  ELSIF _cycle = 'weekly' THEN
    WHILE _next <= CURRENT_DATE LOOP _next := _next + INTERVAL '7 day'; END LOOP;
  ELSIF _cycle = 'quarterly' THEN
    WHILE _next <= CURRENT_DATE LOOP _next := _next + INTERVAL '3 month'; END LOOP;
  END IF;
  RETURN _next;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_next_billing()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.next_billing_date := public.calculate_next_billing(NEW.start_date, NEW.billing_cycle);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_set_next_billing BEFORE INSERT OR UPDATE OF start_date, billing_cycle ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_next_billing();

-- =========================================================
-- HISTORY TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.price IS DISTINCT FROM NEW.price) THEN
    INSERT INTO public.subscription_history(subscription_id, user_id, old_status, new_status, old_price, new_price)
    VALUES (NEW.id, NEW.user_id, OLD.status, NEW.status, OLD.price, NEW.price);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sub_history AFTER UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();

-- =========================================================
-- PAYMENT → SUBSCRIPTION STATUS TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    UPDATE public.subscriptions SET status = 'active' WHERE id = NEW.subscription_id AND status <> 'cancelled';
  ELSIF NEW.status = 'failed' THEN
    UPDATE public.subscriptions SET status = 'at_risk' WHERE id = NEW.subscription_id;
    INSERT INTO public.alerts(user_id, subscription_id, type, severity, title, message)
    VALUES (NEW.user_id, NEW.subscription_id, 'failed_payment', 'critical',
            'Payment failed', 'A payment of ' || NEW.amount || ' failed.');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_payment_status AFTER INSERT OR UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.handle_payment_status();

-- =========================================================
-- AUDIT TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.audit_row()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(user_id, table_name, action, record_id, metadata)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    TG_TABLE_NAME, TG_OP,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('op', TG_OP)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_audit_subs AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.audit_row();

-- =========================================================
-- NEW USER → PROFILE + ROLE
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(user_id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- ANALYTICS FUNCTIONS
-- =========================================================
-- monthly normalized cost
CREATE OR REPLACE FUNCTION public.monthly_cost(_price NUMERIC, _cycle billing_cycle)
RETURNS NUMERIC LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE _cycle
    WHEN 'monthly' THEN _price
    WHEN 'yearly' THEN _price/12.0
    WHEN 'weekly' THEN _price*52.0/12.0
    WHEN 'quarterly' THEN _price/3.0
  END
$$;

CREATE OR REPLACE FUNCTION public.monthly_spending(_user UUID)
RETURNS TABLE(month DATE, total NUMERIC, payment_count BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH monthly AS (
    SELECT date_trunc('month', payment_date)::date AS m,
           SUM(amount) AS t,
           COUNT(*) AS c
    FROM public.payments
    WHERE user_id = _user AND status = 'paid'
    GROUP BY 1
  )
  SELECT m, t, c FROM monthly ORDER BY m DESC;
$$;

CREATE OR REPLACE FUNCTION public.predict_next_month_spending(_user UUID)
RETURNS NUMERIC LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH last3 AS (
    SELECT SUM(amount) AS t
    FROM public.payments
    WHERE user_id = _user AND status = 'paid'
      AND payment_date >= (CURRENT_DATE - INTERVAL '3 month')
    GROUP BY date_trunc('month', payment_date)
  )
  SELECT COALESCE(AVG(t),0) FROM last3;
$$;

CREATE OR REPLACE FUNCTION public.detect_waste(_user UUID)
RETURNS TABLE(subscription_id UUID, name TEXT, monthly_cost NUMERIC, last_used DATE, days_idle INT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name,
         public.monthly_cost(s.price, s.billing_cycle) AS mc,
         MAX(u.used_at) AS last_used,
         COALESCE(CURRENT_DATE - MAX(u.used_at), 9999) AS days_idle
  FROM public.subscriptions s
  LEFT JOIN public.usage_logs u ON u.subscription_id = s.id
  WHERE s.user_id = _user AND s.status IN ('active','at_risk')
  GROUP BY s.id, s.name, s.price, s.billing_cycle
  HAVING COALESCE(CURRENT_DATE - MAX(u.used_at), 9999) > 30
  ORDER BY mc DESC;
$$;

CREATE OR REPLACE FUNCTION public.compute_subscription_score(_user UUID)
RETURNS INTEGER LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  monthly_total NUMERIC := 0;
  budget NUMERIC := 0;
  income NUMERIC := 0;
  waste_count INT := 0;
  active_count INT := 0;
  score INT := 100;
  budget_ratio NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(public.monthly_cost(price, billing_cycle)),0), COUNT(*)
    INTO monthly_total, active_count
    FROM public.subscriptions WHERE user_id = _user AND status IN ('active','at_risk');

  SELECT COALESCE(monthly_limit, 0) INTO budget FROM public.budgets WHERE user_id = _user AND is_active = true LIMIT 1;
  SELECT COALESCE(monthly_income, 0) INTO income FROM public.profiles WHERE user_id = _user;
  SELECT COUNT(*) INTO waste_count FROM public.detect_waste(_user);

  IF budget > 0 THEN
    budget_ratio := monthly_total / budget;
    IF budget_ratio > 1 THEN score := score - 40;
    ELSIF budget_ratio > 0.8 THEN score := score - 20;
    ELSIF budget_ratio > 0.6 THEN score := score - 10;
    END IF;
  END IF;

  IF income > 0 AND monthly_total > income * 0.2 THEN score := score - 15; END IF;
  score := score - LEAST(waste_count * 8, 40);
  IF score < 0 THEN score := 0; END IF;
  RETURN score;
END;
$$;

-- Overspending alert trigger when new payment pushes monthly over budget
CREATE OR REPLACE FUNCTION public.check_budget_after_payment()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  spent NUMERIC;
  lim NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO spent
  FROM public.payments
  WHERE user_id = NEW.user_id AND status = 'paid'
    AND date_trunc('month', payment_date) = date_trunc('month', NEW.payment_date);
  SELECT monthly_limit INTO lim FROM public.budgets WHERE user_id = NEW.user_id AND is_active = true LIMIT 1;
  IF lim IS NOT NULL AND spent > lim THEN
    INSERT INTO public.alerts(user_id, type, severity, title, message)
    VALUES (NEW.user_id, 'overspending', 'critical', 'Budget exceeded',
            'You spent ' || spent || ' this month vs budget of ' || lim);
  ELSIF lim IS NOT NULL AND spent > lim * 0.8 THEN
    INSERT INTO public.alerts(user_id, type, severity, title, message)
    VALUES (NEW.user_id, 'budget_warning', 'warning', 'Approaching budget',
            'You used ' || ROUND(spent/lim*100,0) || '% of monthly budget.');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_budget_check AFTER INSERT ON public.payments
FOR EACH ROW WHEN (NEW.status = 'paid') EXECUTE FUNCTION public.check_budget_after_payment();

-- =========================================================
-- VIEWS
-- =========================================================
CREATE OR REPLACE VIEW public.active_subscriptions AS
SELECT s.*, c.name AS category_name, c.color AS category_color, sv.logo_url,
       public.monthly_cost(s.price, s.billing_cycle) AS normalized_monthly_cost
FROM public.subscriptions s
LEFT JOIN public.categories c ON c.id = s.category_id
LEFT JOIN public.services sv ON sv.id = s.service_id
WHERE s.status IN ('active','at_risk','trial');

CREATE OR REPLACE VIEW public.monthly_spending_summary AS
SELECT user_id,
       date_trunc('month', payment_date)::date AS month,
       SUM(amount) FILTER (WHERE status='paid') AS paid_total,
       COUNT(*) FILTER (WHERE status='paid') AS paid_count,
       COUNT(*) FILTER (WHERE status='failed') AS failed_count,
       RANK() OVER (PARTITION BY user_id ORDER BY SUM(amount) FILTER (WHERE status='paid') DESC NULLS LAST) AS spend_rank
FROM public.payments
GROUP BY user_id, date_trunc('month', payment_date);

CREATE OR REPLACE VIEW public.category_breakdown AS
SELECT s.user_id, c.name AS category, c.color,
       SUM(public.monthly_cost(s.price, s.billing_cycle)) AS monthly_cost,
       COUNT(*) AS sub_count
FROM public.subscriptions s
LEFT JOIN public.categories c ON c.id = s.category_id
WHERE s.status IN ('active','at_risk','trial')
GROUP BY s.user_id, c.name, c.color;

CREATE OR REPLACE VIEW public.dashboard_overview AS
SELECT p.user_id,
       p.monthly_income,
       (SELECT monthly_limit FROM public.budgets b WHERE b.user_id = p.user_id AND b.is_active LIMIT 1) AS budget,
       (SELECT COUNT(*) FROM public.subscriptions s WHERE s.user_id = p.user_id AND s.status IN ('active','at_risk','trial')) AS active_subs,
       (SELECT COALESCE(SUM(public.monthly_cost(price, billing_cycle)),0) FROM public.subscriptions s WHERE s.user_id = p.user_id AND s.status IN ('active','at_risk','trial')) AS monthly_burn,
       (SELECT COALESCE(SUM(amount),0) FROM public.payments py WHERE py.user_id = p.user_id AND py.status='paid' AND date_trunc('month',payment_date)=date_trunc('month',CURRENT_DATE)) AS spent_this_month
FROM public.profiles p;

-- Wasteful: high cost (top 50%) with no usage in 30+ days
CREATE OR REPLACE VIEW public.wasteful_subscriptions AS
WITH ranked AS (
  SELECT s.id, s.user_id, s.name,
         public.monthly_cost(s.price, s.billing_cycle) AS mc,
         MAX(u.used_at) AS last_used,
         NTILE(2) OVER (PARTITION BY s.user_id ORDER BY public.monthly_cost(s.price, s.billing_cycle) DESC) AS cost_tier
  FROM public.subscriptions s
  LEFT JOIN public.usage_logs u ON u.subscription_id = s.id
  WHERE s.status IN ('active','at_risk')
  GROUP BY s.id
)
SELECT id, user_id, name, mc AS monthly_cost, last_used,
       COALESCE(CURRENT_DATE - last_used, 9999) AS days_idle
FROM ranked
WHERE cost_tier = 1 AND COALESCE(CURRENT_DATE - last_used, 9999) > 30;

-- =========================================================
-- SEED: categories + services
-- =========================================================
INSERT INTO public.categories(name, icon, color) VALUES
  ('Streaming', 'tv', '#a78bfa'),
  ('Music', 'music', '#34d399'),
  ('Productivity', 'briefcase', '#60a5fa'),
  ('Cloud Storage', 'cloud', '#22d3ee'),
  ('Gaming', 'gamepad-2', '#f472b6'),
  ('News', 'newspaper', '#fbbf24'),
  ('Fitness', 'dumbbell', '#f87171'),
  ('Developer Tools', 'code', '#818cf8'),
  ('AI Tools', 'sparkles', '#c084fc'),
  ('Other', 'package', '#94a3b8')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.services(name, category_id) VALUES
  ('Netflix', (SELECT id FROM public.categories WHERE name='Streaming')),
  ('Disney+', (SELECT id FROM public.categories WHERE name='Streaming')),
  ('HBO Max', (SELECT id FROM public.categories WHERE name='Streaming')),
  ('Spotify', (SELECT id FROM public.categories WHERE name='Music')),
  ('Apple Music', (SELECT id FROM public.categories WHERE name='Music')),
  ('Notion', (SELECT id FROM public.categories WHERE name='Productivity')),
  ('Linear', (SELECT id FROM public.categories WHERE name='Productivity')),
  ('Figma', (SELECT id FROM public.categories WHERE name='Productivity')),
  ('Dropbox', (SELECT id FROM public.categories WHERE name='Cloud Storage')),
  ('iCloud+', (SELECT id FROM public.categories WHERE name='Cloud Storage')),
  ('Google One', (SELECT id FROM public.categories WHERE name='Cloud Storage')),
  ('Xbox Game Pass', (SELECT id FROM public.categories WHERE name='Gaming')),
  ('PlayStation Plus', (SELECT id FROM public.categories WHERE name='Gaming')),
  ('NYTimes', (SELECT id FROM public.categories WHERE name='News')),
  ('Peloton', (SELECT id FROM public.categories WHERE name='Fitness')),
  ('GitHub Pro', (SELECT id FROM public.categories WHERE name='Developer Tools')),
  ('Vercel Pro', (SELECT id FROM public.categories WHERE name='Developer Tools')),
  ('ChatGPT Plus', (SELECT id FROM public.categories WHERE name='AI Tools')),
  ('Claude Pro', (SELECT id FROM public.categories WHERE name='AI Tools')),
  ('Midjourney', (SELECT id FROM public.categories WHERE name='AI Tools'))
ON CONFLICT (name) DO NOTHING;