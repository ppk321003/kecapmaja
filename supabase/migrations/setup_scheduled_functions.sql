-- ============================================================================
-- SETUP SCHEDULED FUNCTIONS using pg_cron
-- Schedule notifications functions to run at specific times
-- ============================================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 1. KENAIKAN KARIER - Every 1st of month at 08:00 WIB (01:00 UTC)
-- ============================================================================
SELECT cron.schedule(
  'invoke-send-karier-notifications',
  '0 1 1 * *',  -- Every 1st of month at 01:00 UTC (08:00 WIB)
  $$
  SELECT
    net.http_post(
      url:='https://yudlciokearepqzvgzxx.supabase.co/functions/v1/send-karir-notifications',
      headers:='{"Authorization": "Bearer sbp_7b130ec023292c2a64b329dbde0cb27488e9ba1c", "Content-Type": "application/json"}'::jsonb,
      body:='{"source": "pg_cron"}'::jsonb
    ) as request_id;
  $$
);

-- ============================================================================
-- 2. KEBIJAKAN KORPRI - Every 16th of month at 18:00 WIB (11:00 UTC)
-- ============================================================================
SELECT cron.schedule(
  'invoke-send-kebijakan-notifications',
  '0 11 16 * *',  -- Every 16th of month at 11:00 UTC (18:00 WIB)
  $$
  SELECT
    net.http_post(
      url:='https://yudlciokearepqzvgzxx.supabase.co/functions/v1/send-kebijakan-notifications',
      headers:='{"Authorization": "Bearer sbp_7b130ec023292c2a64b329dbde0cb27488e9ba1c", "Content-Type": "application/json"}'::jsonb,
      body:='{"source": "pg_cron"}'::jsonb
    ) as request_id;
  $$
);

-- ============================================================================
-- 3. BIRTHDAY NOTIFICATIONS - Every day at 08:00 WIB (01:00 UTC)
-- ============================================================================
SELECT cron.schedule(
  'invoke-send-birthday-notifications',
  '0 1 * * *',  -- Every day at 01:00 UTC (08:00 WIB)
  $$
  SELECT
    net.http_post(
      url:='https://yudlciokearepqzvgzxx.supabase.co/functions/v1/send-birthday-notifications',
      headers:='{"Authorization": "Bearer sbp_7b130ec023292c2a64b329dbde0cb27488e9ba1c", "Content-Type": "application/json"}'::jsonb,
      body:='{"source": "pg_cron"}'::jsonb
    ) as request_id;
  $$
);

-- ============================================================================
-- View all scheduled jobs
-- ============================================================================
-- SELECT * FROM cron.job;

-- ============================================================================
-- Notes:
-- - Access token in headers should be a service role token (starts with sbp_)
-- - Cron syntax: minute hour day month day_of_week
--   0 1 1 * *  = 01:00 UTC, 1st of month
--   0 11 16 * * = 11:00 UTC, 16th of month  
--   0 1 * * *  = 01:00 UTC, every day
-- ============================================================================
