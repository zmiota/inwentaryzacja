/*
  # Dodanie wsparcia dla produktów i kodów kreskowych

  1. Nowe tabele
    - `products` - Tabela produktów z kodami kreskowymi
      - `id` (uuid, primary key)
      - `name` (text, nazwa produktu)
      - `barcode` (text, kod kreskowy - unikalny)
      - `pku_w` (text, kod PKU i W)
      - `unit` (text, jednostka miary)
      - `net_price` (decimal, cena netto)
      - `category_id` (uuid, reference do categories)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modyfikacje istniejących tabel
    - Dodanie kolumny `barcode` do `inventory_entries`
    - Dodanie kolumny `notes` do `inventory_entries` 

  3. Bezpieczeństwo
    - Włączenie RLS na tabeli `products`
    - Polityki publicznego dostępu
*/

-- Tabela produktów
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

-- Dodaj kolumnę barcode do inventory_entries jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_entries' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE inventory_entries ADD COLUMN barcode text DEFAULT '';
  END IF;
END $$;

-- Dodaj kolumnę notes do inventory_entries jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_entries' AND column_name = 'notes'
  ) THEN
    ALTER TABLE inventory_entries ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- Włącz Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Polityki publicznego dostępu dla produktów
CREATE POLICY "Allow public access to products" 
  ON products FOR ALL 
  USING (true);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_entries_barcode ON inventory_entries(barcode);
