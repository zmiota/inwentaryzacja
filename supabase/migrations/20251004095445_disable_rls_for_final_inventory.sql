/*
  # Disable RLS for final_inventory_entries table

  1. Changes
    - Disable RLS on final_inventory_entries table
    - Drop all existing auth-based policies
    - This allows the custom auth system to work properly
  
  2. Security Notes
    - Required because we use custom auth with app_users table
    - Application-level security is enforced through user_id checks in code
*/

-- Drop all existing policies on final_inventory_entries
DROP POLICY IF EXISTS "Users can view own final inventory entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can create own final inventory entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can update own final inventory entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can delete own final inventory entries" ON final_inventory_entries;

-- Disable RLS on final_inventory_entries
ALTER TABLE final_inventory_entries DISABLE ROW LEVEL SECURITY;
