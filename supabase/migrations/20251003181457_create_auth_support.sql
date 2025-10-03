/*
  # Add Authentication Support

  1. Changes
    - Add user_id columns to tables that need user ownership
    - Enable Row Level Security on all tables
    - Create RLS policies for authenticated users
    
  2. Security
    - All tables require authentication
    - Users can only access their own data
    - Policies check auth.uid() for ownership
*/

-- Add user_id to inventories table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventories' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE inventories ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id to products table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE products ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_inventory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can create own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can update own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can delete own inventories" ON inventories;

DROP POLICY IF EXISTS "Users can view own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can create own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can update own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can delete own inventory entries" ON inventory_entries;

DROP POLICY IF EXISTS "Users can view own final entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can create own final entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can update own final entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can delete own final entries" ON final_inventory_entries;

DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can create own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

DROP POLICY IF EXISTS "Users can view all categories" ON categories;
DROP POLICY IF EXISTS "Users can create categories" ON categories;
DROP POLICY IF EXISTS "Users can update categories" ON categories;
DROP POLICY IF EXISTS "Users can delete categories" ON categories;

-- Inventories policies
CREATE POLICY "Users can view own inventories"
  ON inventories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own inventories"
  ON inventories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventories"
  ON inventories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventories"
  ON inventories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Inventory entries policies
CREATE POLICY "Users can view own inventory entries"
  ON inventory_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = inventory_entries.inventory_id
      AND inventories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own inventory entries"
  ON inventory_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = inventory_entries.inventory_id
      AND inventories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own inventory entries"
  ON inventory_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = inventory_entries.inventory_id
      AND inventories.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = inventory_entries.inventory_id
      AND inventories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own inventory entries"
  ON inventory_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = inventory_entries.inventory_id
      AND inventories.user_id = auth.uid()
    )
  );

-- Final inventory entries policies
CREATE POLICY "Users can view own final entries"
  ON final_inventory_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = final_inventory_entries.inventory_id
      AND inventories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own final entries"
  ON final_inventory_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = final_inventory_entries.inventory_id
      AND inventories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own final entries"
  ON final_inventory_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = final_inventory_entries.inventory_id
      AND inventories.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = final_inventory_entries.inventory_id
      AND inventories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own final entries"
  ON final_inventory_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = final_inventory_entries.inventory_id
      AND inventories.user_id = auth.uid()
    )
  );

-- Products policies
CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Categories policies (shared across all users)
CREATE POLICY "Users can view all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);