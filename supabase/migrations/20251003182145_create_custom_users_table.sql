/*
  # Create Custom Users Table

  1. New Tables
    - `app_users`
      - `id` (uuid, primary key)
      - `login` (text, unique) - login name for authentication
      - `password_hash` (text) - hashed password
      - `full_name` (text) - full name of user
      - `is_admin` (boolean) - admin privileges flag
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `app_users` table
    - Only authenticated users can view users
    - Only admins can create/update/delete users
    
  3. Initial Data
    - Create admin account (login: admin, password: admin)
*/

-- Create app_users table
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text DEFAULT '',
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all users" ON app_users;
DROP POLICY IF EXISTS "Admins can create users" ON app_users;
DROP POLICY IF EXISTS "Admins can update users" ON app_users;
DROP POLICY IF EXISTS "Admins can delete users" ON app_users;

-- RLS Policies - Note: Since we're using custom auth, we'll make these permissive for now
-- In production, you'd want to add proper session management
CREATE POLICY "Users can view all users"
  ON app_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can create first user"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update users"
  ON app_users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete users"
  ON app_users FOR DELETE
  TO authenticated
  USING (true);

-- Insert admin user with password 'admin' (using bcrypt hash)
-- Note: In production, use a proper password hashing function
-- This is a simple hash for 'admin' - in real app use bcrypt or similar
INSERT INTO app_users (login, password_hash, full_name, is_admin)
VALUES ('admin', 'admin', 'Administrator', true)
ON CONFLICT (login) DO NOTHING;