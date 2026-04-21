-- Allow authenticated users to write their own audit rows.
-- This is required for subscription triggers that insert into audit_logs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'users own audit insert'
  ) THEN
    CREATE POLICY "users own audit insert"
      ON public.audit_logs
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
