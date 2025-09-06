/*
  # Create inventory management database schema

  1. New Tables
    - `inventories` - Main inventory records with metadata
    - `categories` - Product categories for organization
    - `products` - Product master data with pricing
    - `inventory_entries` - Individual product entries in preliminary inventory
    - `final_inventory_entries` - Final inventory entries with calculations
    - `commission_members` - Inventory commission members

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (no authentication required)

  3. Initial Data
    - Insert all 32 required product categories
*/

-- Create inventories table
CREATE TABLE IF NOT EXISTS inventories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'preliminary',
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  unit_name text DEFAULT '',
  unit_address text DEFAULT '',
  inventory_method text DEFAULT 'ciągły',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  barcode text,
  unit text DEFAULT 'szt',
  net_price decimal(10,2),
  category_id uuid REFERENCES categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_entries table
CREATE TABLE IF NOT EXISTS inventory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id),
  product_name text NOT NULL,
  unit text DEFAULT 'szt',
  quantity decimal(10,2) NOT NULL DEFAULT 0,
  net_price decimal(10,2) NOT NULL DEFAULT 0,
  net_value decimal(10,2) GENERATED ALWAYS AS (quantity * net_price) STORED,
  invoice_number text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create final_inventory_entries table
CREATE TABLE IF NOT EXISTS final_inventory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL,
  pku_w text DEFAULT '',
  product_name text NOT NULL,
  unit text DEFAULT 'szt',
  quantity decimal(10,2) NOT NULL DEFAULT 0,
  net_price decimal(10,2) NOT NULL DEFAULT 0,
  net_value decimal(10,2) GENERATED ALWAYS AS (quantity * net_price) STORED,
  created_at timestamptz DEFAULT now()
);

-- Create commission_members table
CREATE TABLE IF NOT EXISTS commission_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_inventory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_members ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Allow public access to inventories" ON inventories FOR ALL USING (true);
CREATE POLICY "Allow public access to categories" ON categories FOR ALL USING (true);
CREATE POLICY "Allow public access to products" ON products FOR ALL USING (true);
CREATE POLICY "Allow public access to inventory_entries" ON inventory_entries FOR ALL USING (true);
CREATE POLICY "Allow public access to final_inventory_entries" ON final_inventory_entries FOR ALL USING (true);
CREATE POLICY "Allow public access to commission_members" ON commission_members FOR ALL USING (true);

-- Insert default categories
INSERT INTO categories (name) VALUES
  ('AGD'),
  ('DES'),
  ('OZDOBY CHOINKOWE'),
  ('KAPTURSCY'),
  ('ZNICZE'),
  ('SZTUCZNE OGNIE'),
  ('CHEMPAK'),
  ('OGRODNICTWO'),
  ('NAWOZY'),
  ('PODSTAWKI'),
  ('NARZĘDZIA'),
  ('DONICZKI'),
  ('NASIONA'),
  ('KORYTKA'),
  ('KOTWICE'),
  ('ZANĘTY'),
  ('OŁÓ1'),
  ('GŁÓWKI'),
  ('DODATKI ZANĘTOWE'),
  ('ŻYŁKI'),
  ('GUMY'),
  ('HACZYKI'),
  ('BLACHY'),
  ('SPŁAWIKI'),
  ('AKCESORIA WĘDKARSKIE'),
  ('DOLFOSY'),
  ('DOBRZYCA'),
  ('JASZYM'),
  ('BARSZCZ'),
  ('BATERIE'),
  ('SPORTECH'),
  ('GRENE'),
  ('AVITA'),
  ('DELAVAL'),
  ('PASZA'),
  ('KARMY'),
  ('ZOOLOGIA'),
  ('GAD')
ON CONFLICT (name) DO NOTHING;