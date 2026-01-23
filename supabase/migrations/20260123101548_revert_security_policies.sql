/*
  # Revert Security Policies to Permissive Mode

  This migration reverts the restrictive RLS policies back to the original
  permissive "Allow public access" policies that allow all authenticated users
  full access to all data.
*/

-- 1. REVERT INVENTORIES TABLE
DROP POLICY IF EXISTS "Users can view own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can create own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can update own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can delete own inventories" ON inventories;

CREATE POLICY "Allow public access to inventories"
  ON inventories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. REVERT CATEGORIES TABLE
DROP POLICY IF EXISTS "Authenticated users can view categories" ON categories;
DROP POLICY IF EXISTS "Users can create categories" ON categories;
DROP POLICY IF EXISTS "Users can update categories" ON categories;
DROP POLICY IF EXISTS "Users can delete categories" ON categories;

CREATE POLICY "Allow public access to categories"
  ON categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

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

-- 3. REVERT INVENTORY_ENTRIES TABLE
DROP POLICY IF EXISTS "Users can view own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can create own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can update own inventory entries" ON inventory_entries;
DROP POLICY IF EXISTS "Users can delete own inventory entries" ON inventory_entries;

CREATE POLICY "Allow public access to inventory_entries"
  ON inventory_entries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. REVERT FINAL_INVENTORY_ENTRIES TABLE
DROP POLICY IF EXISTS "Users can view own final entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can create own final entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can update own final entries" ON final_inventory_entries;
DROP POLICY IF EXISTS "Users can delete own final entries" ON final_inventory_entries;

CREATE POLICY "Allow public access to final_inventory_entries"
  ON final_inventory_entries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. REVERT PRODUCTS TABLE
DROP POLICY IF EXISTS "Users can view all products" ON products;
DROP POLICY IF EXISTS "Users can create own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

CREATE POLICY "Allow public access to products"
  ON products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. REVERT APP_USERS TABLE
DROP POLICY IF EXISTS "Users can read own profile" ON app_users;
DROP POLICY IF EXISTS "Users can create own profile" ON app_users;
DROP POLICY IF EXISTS "Users can update own profile" ON app_users;
DROP POLICY IF EXISTS "Users can delete own profile" ON app_users;

CREATE POLICY "Allow user creation"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow user deletion"
  ON app_users FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow user updates"
  ON app_users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
