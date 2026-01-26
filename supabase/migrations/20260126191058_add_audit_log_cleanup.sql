/*
  # Add Audit Log Automatic Cleanup

  1. Function
    - `cleanup_old_audit_logs()` - Usuwa logi starsze niż 72h
    - Zwraca liczbę usuniętych rekordów
  
  2. Scheduled Job
    - Uruchamiany co 24h
    - Usuwa logi starsze niż 72h (3 dni)
  
  3. Extension
    - Włącza pg_cron dla scheduled jobs
*/

-- ========================================
-- 1. ENABLE PG_CRON EXTENSION
-- ========================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ========================================
-- 2. CREATE CLEANUP FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Usuń logi starsze niż 72 godziny
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '72 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup action
  INSERT INTO audit_log (
    user_id,
    action,
    table_name,
    record_id,
    new_data,
    ip_address
  )
  VALUES (
    NULL,
    'AUDIT_CLEANUP',
    'audit_log',
    NULL,
    jsonb_build_object('deleted_count', deleted_count, 'older_than_hours', 72),
    'system'
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. SCHEDULE CLEANUP JOB
-- ========================================

-- Uruchom cleanup codziennie o 3:00 w nocy
DO $$
BEGIN
  -- Remove existing job if it exists
  PERFORM cron.unschedule('cleanup-audit-logs');
EXCEPTION
  WHEN undefined_table THEN
    NULL;
  WHEN undefined_function THEN
    NULL;
  WHEN OTHERS THEN
    NULL;
END $$;

-- Schedule new job
SELECT cron.schedule(
  'cleanup-audit-logs',           -- job name
  '0 3 * * *',                    -- cron schedule: codziennie o 3:00
  'SELECT cleanup_old_audit_logs();'
);

-- ========================================
-- 4. ADD COMMENT FOR DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION cleanup_old_audit_logs() IS 
'Automatycznie usuwa logi audytowe starsze niż 72 godziny. Uruchamiane codziennie o 3:00 przez pg_cron.';
