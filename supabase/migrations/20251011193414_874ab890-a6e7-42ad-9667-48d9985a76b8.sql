-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create storage bucket for EPG data
INSERT INTO storage.buckets (id, name, public)
VALUES ('epg-data', 'epg-data', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policy to allow public read access to EPG data
CREATE POLICY "Public read access to EPG data"
ON storage.objects FOR SELECT
USING (bucket_id = 'epg-data');

-- Create RLS policy to allow service role to write EPG data
CREATE POLICY "Service role can write EPG data"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'epg-data' AND auth.role() = 'service_role');

CREATE POLICY "Service role can update EPG data"
ON storage.objects FOR UPDATE
USING (bucket_id = 'epg-data' AND auth.role() = 'service_role');

CREATE POLICY "Service role can delete EPG data"
ON storage.objects FOR DELETE
USING (bucket_id = 'epg-data' AND auth.role() = 'service_role');