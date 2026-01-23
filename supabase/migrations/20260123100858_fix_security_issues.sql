/*
  # Fix Database Security Issues

  1. Missing Indexes on Foreign Keys
    - Add indexes for better query performance on foreign key columns
  
  2. RLS Policy Optimization
    - Replace auth.uid() with (select auth.uid()) for better performance
    - Remove overly permissive "Allow public access" policies
    - Fix policies with USING (true) or WITH CHECK (true)
  
  3. Enable RLS
    - Enable RLS on tables with disabled security
*/

-- 1. ADD INDEXES ON FOREIGN KEYS
CREATE INDEX IF NOT EXISTS idx_inventory_entries_category_id
  ON inventory_entries(category_id);

CREATE INDEX IF NOT EXISTS idx_inventory_entries_inventory_id
  ON inventory_entries(inventory_id);

CREATE INDEX IF NOT EXISTS idx_final_inventory_entries_category_id
  ON final_inventory_entries(category_id);

CREATE INDEX IF NOT EXISTS idx_final_inventory_entries_inventory_id
  ON final_inventory_entries(inventory_id);

-- 2. ENABLE RLS ON TABLES WITHOUT IT
ALTER TABLE inventory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_inventory_entries ENABLE ROW LEVEL SECURITY;

-- 3. FIX INVENTORIES TABLE - Replace auth.uid() with (select auth.uid())
DROP POLICY IF EXISTS "Users can view own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can create own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can update own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can delete own inventories" ON inventories;
DROP POLICY IF EXISTS "Allow public access to inventories" ON inventories;

CREATE POLICY "Users can view own inventories"
  ON inventories FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own inventories"
  ON inventories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own inventories"
  ON inventories FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own inventories"
  ON inventories FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 4. FIX CATEGORIES TABLE - Read-only for authenticated users (no user_id column)
DROP POLICY IF EXISTS "Allow public access to categories" ON categories;
DROP POLICY IF EXISTS "Users can view all categories" ON categories;
DROP POLICY IF EXISTS "Users can create categories" ON categories;
DROP POLICY IF EXISTS "Users can update categories" ON categories;
DROP POLICY IF EXISTS "Users can delete categories" ON categories;

CREATE POLICY "Authenticated users can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- 5. FIX INVENTORY_ENTRIES TABLE - Access through parent inventory
DROP POLICY IF EXISTS "Allow public access to inventory_entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can view own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can create own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can update own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can delete own inventory entries" ON inventory_entries;

CREATE POLICY "Users can view own inventory entries"
  ON inventory_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = inventory_entries.inventory_id
      AND inventories.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create own inventory entries"
  ON inventory_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = inventory_entries.inventory_id
      AND inventories.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own inventory entries"
  ON inventory_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = inventory_entries.inventory_id
      AND inventories.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = inventory_entries.inventory_id
      AND inventories.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own inventory entries"
  ON inventory_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = inventory_entries.inventory_id
      AND inventories.user_id = (select auth.uid())
    )
  );

-- 6. FIX FINAL_INVENTORY_ENTRIES TABLE - Access through parent inventory
DROP POLICY IF EXISTS "Allow public access to final_inventory_entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can view own final entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can create own final entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can update own final entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can delete own final entries" ON final_inventory_entries;

CREATE POLICY "Users can view own final entries"
  ON final_inventory_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = final_inventory_entries.inventory_id
      AND inventories.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create own final entries"
  ON final_inventory_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = final_inventory_entries.inventory_id
      AND inventories.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own final entries"
  ON final_inventory_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = final_inventory_entries.inventory_id
      AND inventories.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = final_inventory_entries.inventory_id
      AND inventories.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own final entries"
  ON final_inventory_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories
      WHERE inventories.id = final_inventory_entries.inventory_id
      AND inventories.user_id = (select auth.uid())
    )
  );

-- 7. FIX PRODUCTS TABLE - User ownership-based access
DROP POLICY IF EXISTS "Allow public access to products" ON products;
DROP POLICY IF EXISTS "Users can view all products" ON products;
DROP POLICY IF EXISTS "Users can create products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

CREATE POLICY "Users can view all products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 8. FIX APP_USERS TABLE - Restrict to own profile
DROP POLICY IF EXISTS "Allow user creation" ON app_users;
DROP POLICY IF EXISTS "Allow user deletion" ON app_users;
DROP POLICY IF EXISTS "Allow user updates" ON app_users;

CREATE POLICY "Users can read own profile"
  ON app_users FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can create own profile"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON app_users FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can delete own profile"
  ON app_users FOR DELETE
  TO authenticated
  USING (id = (select auth.uid()));
