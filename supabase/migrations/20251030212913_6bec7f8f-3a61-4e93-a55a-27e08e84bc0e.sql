-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to sync channels via HTTP
CREATE OR REPLACE FUNCTION sync_channels_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Schedule the sync to run every hour
SELECT cron.schedule(
  'sync-channels-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$SELECT sync_channels_cron();$$
);

-- Create a table to track sync history
CREATE TABLE IF NOT EXISTS public.channel_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sync_completed_at TIMESTAMP WITH TIME ZONE,
  channels_synced INTEGER,
  status TEXT,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.channel_sync_history ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing sync history
CREATE POLICY "Anyone can view sync history"
  ON public.channel_sync_history
  FOR SELECT
  USING (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_channel_sync_history_started_at 
  ON public.channel_sync_history(sync_started_at DESC);
