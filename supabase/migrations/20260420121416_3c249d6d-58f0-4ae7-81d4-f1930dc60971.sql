CREATE OR REPLACE FUNCTION public.audit_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;