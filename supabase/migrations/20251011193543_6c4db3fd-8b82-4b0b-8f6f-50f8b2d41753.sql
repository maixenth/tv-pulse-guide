-- Schedule EPG update to run daily at 2 AM
SELECT cron.schedule(
  'update-epg-daily',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT
    net.http_post(
        url:='https://tiwajxnucxryusmrndpv.supabase.co/functions/v1/update-epg',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpd2FqeG51Y3hyeXVzbXJuZHB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjI5NTIsImV4cCI6MjA3NTY5ODk1Mn0.YwGJSvbZOis96JRsFsQDLdLD7yFOtBwfJqHlm1fYQzk"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);