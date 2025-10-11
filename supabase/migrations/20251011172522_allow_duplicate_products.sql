/*
  # Zezwolenie na duplikaty produktów
  
  1. Zmiany
    - Usunięcie ograniczenia UNIQUE z kolumny barcode w tabeli products
    - Produkty mogą mieć teraz te same nazwy i kody kreskowe
  
  2. Uzasadnienie
    - Użytkownik chce wprowadzać produkty z tą samą nazwą i kodem kreskowym
    - Różne produkty mogą mieć różne ceny w różnych fakturach
*/

-- Usuń indeks UNIQUE na kolumnie barcode jeśli istnieje
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_barcode_key'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT products_barcode_key;
  END IF;
END $$;

-- Usuń istniejący indeks partial unique jeśli istnieje
DROP INDEX IF EXISTS idx_products_barcode_unique;

-- Pozostaw zwykły indeks dla wydajności wyszukiwania
CREATE INDEX IF NOT EXISTS idx_products_barcode_search ON products(barcode) WHERE barcode IS NOT NULL AND barcode != '';
