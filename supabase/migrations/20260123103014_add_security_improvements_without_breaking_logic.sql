/*
  # Security Improvements Without Breaking Existing Logic

  This migration adds security improvements that don't break the current
  custom authentication system or application logic.

  ## Changes

  1. Performance & Security Indexes
    - Add indexes on foreign keys for better query performance
    - Add indexes on commonly queried fields

  2. Data Validation Constraints
    - Add CHECK constraints to prevent negative quantities and prices
    - Add CHECK constraints for valid statuses and types

  3. Referential Integrity
    - Add ON DELETE CASCADE for proper cleanup of related records

  4. Automatic Timestamp Updates
    - Add triggers to automatically update updated_at timestamps

  ## Security Notes
    - These changes improve data integrity and performance
    - Current authentication logic remains unchanged
    - No breaking changes to existing application code
*/

-- ========================================
-- 1. ADD PERFORMANCE INDEXES ON FOREIGN KEYS
-- ========================================

-- Inventory entries indexes
CREATE INDEX IF NOT EXISTS idx_inventory_entries_inventory_id
  ON inventory_entries(inventory_id);

CREATE INDEX IF NOT EXISTS idx_inventory_entries_category_id
  ON inventory_entries(category_id);

-- Final inventory entries indexes
CREATE INDEX IF NOT EXISTS idx_final_inventory_entries_inventory_id
  ON final_inventory_entries(inventory_id);

CREATE INDEX IF NOT EXISTS idx_final_inventory_entries_category_id
  ON final_inventory_entries(category_id);

-- Inventories indexes
CREATE INDEX IF NOT EXISTS idx_inventories_user_id
  ON inventories(user_id);

CREATE INDEX IF NOT EXISTS idx_inventories_status
  ON inventories(status);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_user_id
  ON products(user_id);

-- ========================================
-- 2. ADD DATA VALIDATION CONSTRAINTS
-- ========================================

-- Ensure quantities are not negative
ALTER TABLE inventory_entries
  ADD CONSTRAINT check_inventory_entries_quantity_positive
  CHECK (quantity >= 0);

ALTER TABLE inventory_entries
  ADD CONSTRAINT check_inventory_entries_net_price_positive
  CHECK (net_price >= 0);

ALTER TABLE final_inventory_entries
  ADD CONSTRAINT check_final_inventory_entries_quantity_positive
  CHECK (quantity >= 0);

ALTER TABLE final_inventory_entries
  ADD CONSTRAINT check_final_inventory_entries_net_price_positive
  CHECK (net_price >= 0);

ALTER TABLE products
  ADD CONSTRAINT check_products_net_price_positive
  CHECK (net_price >= 0);

-- Ensure valid inventory types
ALTER TABLE inventories
  ADD CONSTRAINT check_inventories_type_valid
  CHECK (type IN ('preliminary', 'final'));

-- Ensure valid inventory statuses
ALTER TABLE inventories
  ADD CONSTRAINT check_inventories_status_valid
  CHECK (status IN ('active', 'completed', 'archived'));

-- Ensure sequence numbers are positive
ALTER TABLE final_inventory_entries
  ADD CONSTRAINT check_final_inventory_entries_sequence_positive
  CHECK (sequence_number > 0);

ALTER TABLE final_inventory_entries
  ADD CONSTRAINT check_final_inventory_entries_row_positive
  CHECK (row_number > 0);

-- ========================================
-- 3. ADD REFERENTIAL INTEGRITY
-- ========================================

-- Drop existing foreign keys if they exist (without CASCADE)
ALTER TABLE inventory_entries
  DROP CONSTRAINT IF EXISTS inventory_entries_inventory_id_fkey;

ALTER TABLE inventory_entries
  DROP CONSTRAINT IF EXISTS inventory_entries_category_id_fkey;

ALTER TABLE final_inventory_entries
  DROP CONSTRAINT IF EXISTS final_inventory_entries_inventory_id_fkey;

ALTER TABLE final_inventory_entries
  DROP CONSTRAINT IF EXISTS final_inventory_entries_category_id_fkey;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_category_id_fkey;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_user_id_fkey;

ALTER TABLE inventories
  DROP CONSTRAINT IF EXISTS inventories_user_id_fkey;

-- Add foreign keys with proper CASCADE behavior
ALTER TABLE inventory_entries
  ADD CONSTRAINT inventory_entries_inventory_id_fkey
  FOREIGN KEY (inventory_id)
  REFERENCES inventories(id)
  ON DELETE CASCADE;

ALTER TABLE inventory_entries
  ADD CONSTRAINT inventory_entries_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES categories(id)
  ON DELETE RESTRICT;

ALTER TABLE final_inventory_entries
  ADD CONSTRAINT final_inventory_entries_inventory_id_fkey
  FOREIGN KEY (inventory_id)
  REFERENCES inventories(id)
  ON DELETE CASCADE;

ALTER TABLE final_inventory_entries
  ADD CONSTRAINT final_inventory_entries_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES categories(id)
  ON DELETE RESTRICT;

ALTER TABLE products
  ADD CONSTRAINT products_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES categories(id)
  ON DELETE SET NULL;

ALTER TABLE products
  ADD CONSTRAINT products_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES app_users(id)
  ON DELETE SET NULL;

ALTER TABLE inventories
  ADD CONSTRAINT inventories_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES app_users(id)
  ON DELETE SET NULL;

-- ========================================
-- 4. AUTOMATIC TIMESTAMP UPDATES
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_app_users_updated_at ON app_users;
DROP TRIGGER IF EXISTS update_inventories_updated_at ON inventories;
DROP TRIGGER IF EXISTS update_inventory_entries_updated_at ON inventory_entries;
DROP TRIGGER IF EXISTS update_final_inventory_entries_updated_at ON final_inventory_entries;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventories_updated_at
  BEFORE UPDATE ON inventories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_entries_updated_at
  BEFORE UPDATE ON inventory_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_final_inventory_entries_updated_at
  BEFORE UPDATE ON final_inventory_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. ADD LOGIN SECURITY INDEX
-- ========================================

-- Index for faster login lookups (already exists but ensuring it's there)
CREATE INDEX IF NOT EXISTS idx_app_users_login
  ON app_users(login);
