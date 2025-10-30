-- Fix the security warning by setting search_path
DROP FUNCTION IF EXISTS sync_channels_cron();

CREATE OR REPLACE FUNCTION sync_channels_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the sync-channels edge function
  PERFORM net.http_post(
    url := 'https://tiwajxnucxryusmrndpv.supabase.co/functions/v1/sync-channels',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
END;
$$;
