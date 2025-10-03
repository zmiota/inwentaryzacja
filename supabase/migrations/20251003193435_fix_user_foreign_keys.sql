/*
  # Fix user foreign key constraints

  1. Changes
    - Drop foreign key constraints from products and inventories that reference auth.users
    - Products and inventories will use app_users table instead
    - Keep user_id columns but remove the foreign key constraint
  
  2. Security
    - RLS policies will still enforce user ownership
    - This allows custom auth system to work properly

  3. Notes
    - We're using custom auth with app_users table instead of Supabase auth
    - The user_id column will still store the app_users.id
*/

-- Drop foreign key constraint from products table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'products_user_id_fkey'
    AND table_name = 'products'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT products_user_id_fkey;
  END IF;
END $$;

-- Drop foreign key constraint from inventories table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inventories_user_id_fkey'
    AND table_name = 'inventories'
  ) THEN
    ALTER TABLE inventories DROP CONSTRAINT inventories_user_id_fkey;
  END IF;
END $$;
