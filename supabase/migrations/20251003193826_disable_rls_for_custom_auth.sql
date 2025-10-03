/*
  # Disable RLS for custom authentication system

  1. Changes
    - Disable RLS on inventory_entries table temporarily
    - Drop all existing auth-based policies
    - This allows the custom auth system to work properly
  
  2. Security Notes
    - This is required because we use custom auth with app_users table
    - In production, you should implement proper RLS policies based on app_users
    - For now, application-level security is enforced through user_id checks
*/

-- Drop all existing policies on inventory_entries
DROP POLICY IF EXISTS "Allow public access to inventory_entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can view own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can create own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can update own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can delete own inventory entries" ON inventory_entries;

-- Disable RLS on inventory_entries
ALTER TABLE inventory_entries DISABLE ROW LEVEL SECURITY;
