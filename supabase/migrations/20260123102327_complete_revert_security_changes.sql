/*
  # Complete Revert of Security Changes from 2026-01-23

  This migration completely reverts all security changes made today by:
  1. Disabling RLS on tables where it was enabled
  2. Removing indexes that were added for foreign keys
  3. Restoring the system to its pre-security-update state

  ## Changes

  1. Disable RLS
    - Disable RLS on inventory_entries
    - Disable RLS on products
    - Disable RLS on final_inventory_entries

  2. Remove Indexes
    - Drop idx_inventory_entries_category_id
    - Drop idx_inventory_entries_inventory_id
    - Drop idx_final_inventory_entries_category_id
    - Drop idx_final_inventory_entries_inventory_id

  ## Security Notes
    - This reverts to the original system using custom auth with app_users table
    - Application-level security is enforced through user_id checks in code
*/

-- 1. DISABLE RLS ON TABLES
ALTER TABLE inventory_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE final_inventory_entries DISABLE ROW LEVEL SECURITY;

-- 2. REMOVE INDEXES ADDED FOR FOREIGN KEYS
DROP INDEX IF EXISTS idx_inventory_entries_category_id;
DROP INDEX IF EXISTS idx_inventory_entries_inventory_id;
DROP INDEX IF EXISTS idx_final_inventory_entries_category_id;
DROP INDEX IF EXISTS idx_final_inventory_entries_inventory_id;
