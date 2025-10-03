/*
  # Fix app_users INSERT policy

  1. Changes
    - Allow anyone to insert users (since we're not using Supabase auth)
    - Keep other operations open as well for our custom auth system
    
  2. Security Notes
    - Since we're using a custom auth system with localStorage, we need open policies
    - In production, consider implementing proper server-side authentication
    - Password hashing should be added for security
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow login verification" ON app_users;
DROP POLICY IF EXISTS "Authenticated users can create users" ON app_users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON app_users;
DROP POLICY IF EXISTS "Authenticated users can delete users" ON app_users;

-- Allow anyone to read users (needed for login)
CREATE POLICY "Allow login verification"
  ON app_users FOR SELECT
  USING (true);

-- Allow anyone to insert (since we're not using Supabase auth properly)
CREATE POLICY "Allow user creation"
  ON app_users FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update
CREATE POLICY "Allow user updates"
  ON app_users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anyone to delete
CREATE POLICY "Allow user deletion"
  ON app_users FOR DELETE
  USING (true);