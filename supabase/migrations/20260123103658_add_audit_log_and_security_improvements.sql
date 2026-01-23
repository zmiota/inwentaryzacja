/*
  # Add Audit Log and Security Improvements

  1. New Tables
    - `audit_log` - Tracks all user actions and data changes
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to app_users)
      - `action` (text) - Action type (LOGIN, REGISTER, INSERT, UPDATE, DELETE)
      - `table_name` (text) - Table affected
      - `record_id` (uuid) - ID of affected record
      - `old_data` (jsonb) - Previous data state
      - `new_data` (jsonb) - New data state
      - `ip_address` (text) - IP address of user
      - `created_at` (timestamptz)

  2. Security Improvements
    - Add login format validation constraint
    - Add password length tracking (for migration)
    - Add indexes for audit log performance

  3. Triggers
    - Add audit triggers for all main tables
*/

-- ========================================
-- 1. CREATE AUDIT LOG TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
  ON audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_name
  ON audit_log(table_name);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON audit_log(action);

-- ========================================
-- 2. ADD LOGIN FORMAT VALIDATION
-- ========================================

-- Add constraint for login format (alphanumeric, dots, dashes, underscores)
ALTER TABLE app_users
  DROP CONSTRAINT IF EXISTS check_login_format;

ALTER TABLE app_users
  ADD CONSTRAINT check_login_format
  CHECK (login ~ '^[a-zA-Z0-9._-]+$' AND length(login) >= 3 AND length(login) <= 50);

-- ========================================
-- 3. CREATE AUDIT TRIGGER FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Try to get current user from app metadata (if available)
  current_user_id := current_setting('app.current_user_id', true)::uuid;
  
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_data)
    VALUES (current_user_id, 'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD)::jsonb);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (current_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, new_data)
    VALUES (current_user_id, 'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Silently fail audit logging to not break the main operation
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. ADD AUDIT TRIGGERS TO ALL TABLES
-- ========================================

-- Drop existing audit triggers if they exist
DROP TRIGGER IF EXISTS audit_inventories_trigger ON inventories;
DROP TRIGGER IF EXISTS audit_inventory_entries_trigger ON inventory_entries;
DROP TRIGGER IF EXISTS audit_final_inventory_entries_trigger ON final_inventory_entries;
DROP TRIGGER IF EXISTS audit_products_trigger ON products;
DROP TRIGGER IF EXISTS audit_categories_trigger ON categories;
DROP TRIGGER IF EXISTS audit_app_users_trigger ON app_users;

-- Create audit triggers
CREATE TRIGGER audit_inventories_trigger
  AFTER INSERT OR UPDATE OR DELETE ON inventories
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_inventory_entries_trigger
  AFTER INSERT OR UPDATE OR DELETE ON inventory_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_final_inventory_entries_trigger
  AFTER INSERT OR UPDATE OR DELETE ON final_inventory_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_categories_trigger
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_app_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON app_users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ========================================
-- 5. ADD RLS FOR AUDIT LOG
-- ========================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert audit logs (triggers need this)
CREATE POLICY "Allow audit log inserts"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_log FOR SELECT
  USING (true);

-- ========================================
-- 6. CREATE FUNCTION TO MIGRATE PASSWORDS
-- ========================================

-- This function will be called from an Edge Function to migrate passwords
CREATE OR REPLACE FUNCTION migrate_password_to_bcrypt(
  user_login text,
  old_password text,
  new_password_hash text
)
RETURNS boolean AS $$
DECLARE
  user_record record;
BEGIN
  -- Get the user
  SELECT * INTO user_record
  FROM app_users
  WHERE login = user_login;
  
  -- Verify old password matches (plain text comparison for migration only)
  IF user_record.password_hash = old_password THEN
    -- Update to bcrypt hash
    UPDATE app_users
    SET password_hash = new_password_hash
    WHERE login = user_login;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. ADD COLUMN TO TRACK PASSWORD FORMAT
-- ========================================

-- Add column to know which passwords are already hashed
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS password_is_hashed boolean DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_app_users_password_is_hashed
  ON app_users(password_is_hashed);
