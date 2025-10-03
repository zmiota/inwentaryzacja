/*
  # Fix app_users RLS for login

  1. Changes
    - Update RLS policies to allow login without authentication
    - Allow public access to app_users for login verification
    
  2. Security Notes
    - We need to allow unauthenticated access for login to work
    - In production, consider using a server-side function for authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all users" ON app_users;
DROP POLICY IF EXISTS "Anyone can create first user" ON app_users;
DROP POLICY IF EXISTS "Anyone can update users" ON app_users;
DROP POLICY IF EXISTS "Anyone can delete users" ON app_users;

-- Allow anyone to read users (needed for login)
CREATE POLICY "Allow login verification"
  ON app_users FOR SELECT
  USING (true);

-- Allow authenticated users to insert (for creating new users)
CREATE POLICY "Authenticated users can create users"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update users"
  ON app_users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete users"
  ON app_users FOR DELETE
  TO authenticated
  USING (true);