-- ============================================================================
-- SKRYPT TWORZENIA BAZY DANYCH DLA SYSTEMU INWENTARYZACJI
-- ============================================================================
-- Ten skrypt zawiera wszystkie tabele, indeksy i dane potrzebne do uruchomienia
-- systemu inwentaryzacji na PostgreSQL.
--
-- INSTRUKCJA:
-- 1. Połącz się z bazą PostgreSQL jako użytkownik z uprawnieniami CREATE TABLE
-- 2. Uruchom ten skrypt: psql -U [użytkownik] -d [nazwa_bazy] -f database_setup.sql
-- ============================================================================

-- Włącz rozszerzenie UUID (jeśli jeszcze nie jest włączone)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABELA: inventories
-- Przechowuje główne rekordy inwentaryzacji z metadanymi
-- ============================================================================
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

COMMENT ON TABLE inventories IS 'Główne rekordy inwentaryzacji';
COMMENT ON COLUMN inventories.name IS 'Nazwa inwentaryzacji';
COMMENT ON COLUMN inventories.type IS 'Typ inwentaryzacji: preliminary lub final';
COMMENT ON COLUMN inventories.inventory_method IS 'Metoda inwentaryzacji (np. ciągły, okresowy)';
COMMENT ON COLUMN inventories.status IS 'Status: active, completed, archived';

-- ============================================================================
-- TABELA: categories
-- Przechowuje kategorie produktów
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE categories IS 'Kategorie produktów';
COMMENT ON COLUMN categories.name IS 'Nazwa kategorii (unikalna)';

-- ============================================================================
-- TABELA: products
-- Przechowuje produkty z kodami kreskowymi
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  barcode text UNIQUE,
  pku_w text DEFAULT '',
  unit text DEFAULT 'szt',
  net_price decimal(10,2) DEFAULT 0,
  category_id uuid REFERENCES categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE products IS 'Produkty z kodami kreskowymi';
COMMENT ON COLUMN products.barcode IS 'Kod kreskowy produktu (unikalny)';
COMMENT ON COLUMN products.pku_w IS 'Kod PKU i W';
COMMENT ON COLUMN products.unit IS 'Jednostka miary (szt, kg, l, itp.)';
COMMENT ON COLUMN products.net_price IS 'Cena netto';

-- ============================================================================
-- TABELA: inventory_entries
-- Przechowuje wpisy inwentaryzacji wstępnej
-- ============================================================================
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
  barcode text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE inventory_entries IS 'Wpisy inwentaryzacji wstępnej';
COMMENT ON COLUMN inventory_entries.net_value IS 'Wartość netto (obliczana automatycznie)';
COMMENT ON COLUMN inventory_entries.invoice_number IS 'Numer faktury';
COMMENT ON COLUMN inventory_entries.barcode IS 'Kod kreskowy produktu';
COMMENT ON COLUMN inventory_entries.notes IS 'Uwagi';

-- ============================================================================
-- TABELA: final_inventory_entries
-- Przechowuje wpisy inwentaryzacji końcowej
-- ============================================================================
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

COMMENT ON TABLE final_inventory_entries IS 'Wpisy inwentaryzacji końcowej';
COMMENT ON COLUMN final_inventory_entries.sequence_number IS 'Numer sekwencyjny wpisu';
COMMENT ON COLUMN final_inventory_entries.row_number IS 'Numer wiersza w raporcie';

-- ============================================================================
-- INDEKSY DLA LEPSZEJ WYDAJNOŚCI
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_entries_barcode ON inventory_entries(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_entries_inventory ON inventory_entries(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_entries_category ON inventory_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_final_entries_inventory ON final_inventory_entries(inventory_id);

-- ============================================================================
-- DANE POCZĄTKOWE: KATEGORIE
-- Wstawienie wszystkich wymaganych kategorii produktów
-- ============================================================================
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
  ('OŁÓWKI'),
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

-- ============================================================================
-- OPCJONALNIE: Row Level Security (RLS)
-- Odkomentuj poniższe sekcje, jeśli używasz Supabase lub chcesz włączyć RLS
-- ============================================================================

/*
-- Włącz Row Level Security
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_inventory_entries ENABLE ROW LEVEL SECURITY;

-- Polityki publicznego dostępu (UWAGA: To pozwala każdemu na dostęp!)
-- Dostosuj te polityki zgodnie z Twoimi wymaganiami bezpieczeństwa
CREATE POLICY "Allow public access to inventories"
  ON inventories FOR ALL
  USING (true);

CREATE POLICY "Allow public access to categories"
  ON categories FOR ALL
  USING (true);

CREATE POLICY "Allow public access to products"
  ON products FOR ALL
  USING (true);

CREATE POLICY "Allow public access to inventory_entries"
  ON inventory_entries FOR ALL
  USING (true);

CREATE POLICY "Allow public access to final_inventory_entries"
  ON final_inventory_entries FOR ALL
  USING (true);
*/

-- ============================================================================
-- FUNKCJE POMOCNICZE (OPCJONALNE)
-- ============================================================================

-- Funkcja do automatycznej aktualizacji pola updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggery dla automatycznej aktualizacji updated_at
DROP TRIGGER IF EXISTS update_inventories_updated_at ON inventories;
CREATE TRIGGER update_inventories_updated_at
  BEFORE UPDATE ON inventories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_entries_updated_at ON inventory_entries;
CREATE TRIGGER update_inventory_entries_updated_at
  BEFORE UPDATE ON inventory_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_final_inventory_entries_updated_at ON final_inventory_entries;
CREATE TRIGGER update_final_inventory_entries_updated_at
  BEFORE UPDATE ON final_inventory_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- KONIEC SKRYPTU
-- ============================================================================

-- Wyświetl podsumowanie
SELECT
  'Baza danych została pomyślnie utworzona!' as status,
  (SELECT COUNT(*) FROM categories) as liczba_kategorii;

-- Wyświetl wszystkie tabele
SELECT
  table_name as "Utworzone tabele"
FROM
  information_schema.tables
WHERE
  table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY
  table_name;
