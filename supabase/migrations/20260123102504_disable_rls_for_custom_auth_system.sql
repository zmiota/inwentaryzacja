/*
  # Disable RLS for Custom Auth System

  This migration disables RLS on tables that still have it enabled,
  allowing the custom authentication system (using app_users table)
  to work properly.

  ## Changes

  1. Disable RLS
    - Disable RLS on inventories table
    - Disable RLS on categories table
    - Disable RLS on app_users table

  ## Security Notes
    - This application uses a custom auth system with the app_users table
    - Users authenticate via localStorage tokens, not Supabase Auth
    - Application-level security is enforced through user_id checks in code
    - RLS policies requiring "authenticated" role don't work with custom auth
*/

-- Disable RLS on all tables to allow custom auth system to work
ALTER TABLE inventories DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
