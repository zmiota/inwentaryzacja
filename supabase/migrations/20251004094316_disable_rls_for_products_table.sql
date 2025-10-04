/*
  # Disable RLS for products table

  1. Changes
    - Disable RLS on products table
    - Drop all existing auth-based policies
    - This allows the custom auth system to work properly with products
  
  2. Security Notes
    - Required because we use custom auth with app_users table
    - Application-level security is enforced through user_id checks in code
*/

-- Drop all existing policies on products
DROP POLICY IF EXISTS "Allow public access to products" ON products;
DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can create own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

-- Disable RLS on products
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
