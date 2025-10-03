/*
  # Uproszczony schemat inwentaryzacji

  1. Nowe tabele
    - `inventories` - Główne rekordy inwentaryzacji z metadanymi
    - `categories` - Kategorie produktów
    - `inventory_entries` - Wpisy inwentaryzacji wstępnej
    - `final_inventory_entries` - Wpisy inwentaryzacji końcowej

  2. Bezpieczeństwo
    - Włączenie RLS na wszystkich tabelach
    - Polityki publicznego dostępu (brak wymaganej autentykacji)

  3. Dane początkowe
    - Wstawienie wszystkich 32 wymaganych kategorii produktów
*/

-- Tabela inwentaryzacji
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

-- Tabela kategorii
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Tabela wpisów inwentaryzacji wstępnej
CREATE TABLE IF NOT EXISTS inventory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id),
  product_name text NOT NULL,
  pku_w text DEFAULT '',
  unit text DEFAULT 'szt',
  quantity decimal(10,2) NOT NULL DEFAULT 0,
  net_price decimal(10,2) NOT NULL DEFAULT 0,
  net_value decimal(10,2) GENERATED ALWAYS AS (quantity * net_price) STORED,
  invoice_number text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela wpisów inwentaryzacji końcowej
CREATE TABLE IF NOT EXISTS final_inventory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL,
  row_number integer NOT NULL DEFAULT 1,
  pku_w text DEFAULT '',
  product_name text NOT NULL,
  unit text DEFAULT 'szt',
  quantity decimal(10,2) NOT NULL DEFAULT 0,
  net_price decimal(10,2) NOT NULL DEFAULT 0,
  net_value decimal(10,2) GENERATED ALWAYS AS (quantity * net_price) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Włącz Row Level Security
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_inventory_entries ENABLE ROW LEVEL SECURITY;

-- Polityki publicznego dostępu
CREATE POLICY "Allow public access to inventories" 
  ON inventories FOR ALL 
  USING (true);

CREATE POLICY "Allow public access to categories" 
  ON categories FOR ALL 
  USING (true);

CREATE POLICY "Allow public access to inventory_entries" 
  ON inventory_entries FOR ALL 
  USING (true);

CREATE POLICY "Allow public access to final_inventory_entries" 
  ON final_inventory_entries FOR ALL 
  USING (true);

-- Wstaw domyślne kategorie
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