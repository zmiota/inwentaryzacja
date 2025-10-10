-- ============================================
-- EKSPORT BAZY DANYCH POSTGRESQL
-- Aplikacja: System Zarządzania Inwentaryzacją
-- Data eksportu: 2025-10-10
-- ============================================

-- ============================================
-- 1. SCHEMAT BAZY DANYCH
-- ============================================

-- Tabela: inventories
CREATE TABLE IF NOT EXISTS inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'preliminary',
    start_date DATE,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    unit_name TEXT DEFAULT '',
    unit_address TEXT DEFAULT '',
    inventory_method TEXT DEFAULT 'ciągły',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID
);

-- Tabela: categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    barcode TEXT,
    pku_w TEXT DEFAULT '',
    unit TEXT DEFAULT 'szt',
    net_price NUMERIC DEFAULT 0,
    category_id UUID REFERENCES categories(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID,
    invoice_number TEXT DEFAULT '',
    notes TEXT DEFAULT ''
);

-- Indeks częściowy na barcode (tylko niepuste wartości)
CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_unique_idx
ON products (barcode)
WHERE barcode IS NOT NULL AND barcode != '';

-- Tabela: inventory_entries
CREATE TABLE IF NOT EXISTS inventory_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventories(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    product_name TEXT NOT NULL,
    pku_w TEXT DEFAULT '',
    unit TEXT DEFAULT 'szt',
    quantity NUMERIC NOT NULL DEFAULT 0,
    net_price NUMERIC NOT NULL DEFAULT 0,
    net_value NUMERIC GENERATED ALWAYS AS (quantity * net_price) STORED,
    invoice_number TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    barcode TEXT DEFAULT '',
    notes TEXT DEFAULT ''
);

-- Tabela: final_inventory_entries
CREATE TABLE IF NOT EXISTS final_inventory_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventories(id),
    sequence_number INTEGER NOT NULL,
    row_number INTEGER NOT NULL DEFAULT 1,
    pku_w TEXT DEFAULT '',
    product_name TEXT NOT NULL,
    unit TEXT DEFAULT 'szt',
    quantity NUMERIC NOT NULL DEFAULT 0,
    net_price NUMERIC NOT NULL DEFAULT 0,
    net_value NUMERIC GENERATED ALWAYS AS (quantity * net_price) STORED,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    barcode TEXT,
    invoice_number TEXT,
    notes TEXT,
    category_id UUID REFERENCES categories(id)
);

-- Tabela: app_users (użytkownicy aplikacji)
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================

-- RLS dla inventories
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;

-- RLS dla categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS dla app_users
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- UWAGA: Dla prostoty, RLS jest wyłączony dla:
-- - inventory_entries
-- - final_inventory_entries
-- - products

-- ============================================
-- 3. DANE - APP_USERS
-- ============================================

INSERT INTO app_users (id, login, password_hash, full_name, is_admin, created_at, updated_at) VALUES
('ca0e1370-aa88-4739-b343-b0b78d1c7699', 'admin', 'admin', 'Administrator', true, '2025-10-03 18:21:46.908224+00', '2025-10-03 18:21:46.908224+00'),
('26d66309-bbe4-4eec-8841-ee71089ea5d5', 'iza', 'Weronika1603!', 'Izabella Pawłowska', false, '2025-10-03 18:34:02.857752+00', '2025-10-03 18:34:02.857752+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. DANE - CATEGORIES
-- ============================================

INSERT INTO categories (id, name, description, created_at) VALUES
('e5a85486-8360-4917-8f90-999ab1c4e506', 'AGD', '', '2025-10-03 14:32:05.933792+00'),
('14e4fed8-6437-43f8-bb11-56fa9b06f6f1', 'DES', '', '2025-10-03 14:32:05.933792+00'),
('48836cf9-3c69-43a2-8c29-e7c9b4b425ef', 'OZDOBY CHOINKOWE', '', '2025-10-03 14:32:05.933792+00'),
('0884e567-b30a-401d-88d3-fd944735f916', 'KAPTURSCY', '', '2025-10-03 14:32:05.933792+00'),
('afb8e4f0-1076-4d29-abf9-6c3e1932e5e7', 'ZNICZE', '', '2025-10-03 14:32:05.933792+00'),
('5376f5d4-8c85-4840-ab70-37a4d47b1b7d', 'SZTUCZNE OGNIE', '', '2025-10-03 14:32:05.933792+00'),
('dc70541f-12c4-4458-8cc8-2db55a0e93f1', 'CHEMPAK', '', '2025-10-03 14:32:05.933792+00'),
('76b015e6-a9c1-48eb-8252-58a20ca275de', 'OGRODNICTWO', '', '2025-10-03 14:32:05.933792+00'),
('b57dc7f9-1aa9-46b8-8a45-6531b6e898d3', 'NAWOZY', '', '2025-10-03 14:32:05.933792+00'),
('c7131eb4-e9bd-40a1-852d-8e48f5551051', 'PODSTAWKI', '', '2025-10-03 14:32:05.933792+00'),
('82ebae5a-f4e9-4135-b38d-caf35ec1c627', 'NARZĘDZIA', '', '2025-10-03 14:32:05.933792+00'),
('b299535a-03c7-4f46-b14b-5bbf7f466805', 'DONICZKI', '', '2025-10-03 14:32:05.933792+00'),
('9ee7d322-7e2f-46a1-8094-a682c2e40664', 'NASIONA', '', '2025-10-03 14:32:05.933792+00'),
('f771fffb-2ede-440a-9cb0-55d097cd8c72', 'KORYTKA', '', '2025-10-03 14:32:05.933792+00'),
('403c7a4a-b16a-4edc-8ad6-b7cabc8dad33', 'KOTWICE', '', '2025-10-03 14:32:05.933792+00'),
('9064e3a9-d69f-4691-acec-49bdcd7a14fa', 'ZANĘTY', '', '2025-10-03 14:32:05.933792+00'),
('c80d1d98-6a8d-4a37-8672-faf71ace2491', 'OŁÓ1', '', '2025-10-03 14:32:05.933792+00'),
('28876d4e-26e4-4b1f-ac9f-f2fe9dc27540', 'GŁÓWKI', '', '2025-10-03 14:32:05.933792+00'),
('1a4d103e-c376-48f6-b07c-8016cc7e166f', 'DODATKI ZANĘTOWE', '', '2025-10-03 14:32:05.933792+00'),
('02cf1261-486a-41d7-85b0-763b82d31402', 'ŻYŁKI', '', '2025-10-03 14:32:05.933792+00'),
('25408930-87f1-4ce9-8eef-7b4338f51ed1', 'GUMY', '', '2025-10-03 14:32:05.933792+00'),
('11a1497c-1f2d-4c69-bde1-34fdf6587340', 'HACZYKI', '', '2025-10-03 14:32:05.933792+00'),
('7a3011de-ce25-4fce-bfd3-888e1c38d74d', 'BLACHY', '', '2025-10-03 14:32:05.933792+00'),
('2bd687ea-63b4-4c76-a809-8110b8672080', 'SPŁAWIKI', '', '2025-10-03 14:32:05.933792+00'),
('607caa02-2b44-4d0c-824d-0297035a6254', 'AKCESORIA WĘDKARSKIE', '', '2025-10-03 14:32:05.933792+00'),
('9550e460-8a63-46d3-89cb-60014c1cf15f', 'DOLFOSY', '', '2025-10-03 14:32:05.933792+00'),
('d6991c68-88ff-4dab-9ab1-9c2c6615d379', 'DOBRZYCA', '', '2025-10-03 14:32:05.933792+00'),
('d51b47b2-4253-40d9-8776-ebde3e033d78', 'JASZYM', '', '2025-10-03 14:32:05.933792+00'),
('eee89e5e-e9bd-4750-a638-ab1ab8ea8f11', 'BARSZCZ', '', '2025-10-03 14:32:05.933792+00'),
('5d1fd688-86db-4aff-b609-36dd97aaaec7', 'BATERIE', '', '2025-10-03 14:32:05.933792+00'),
('24c8d4c0-57ab-4f1a-8129-aee58616b8d5', 'SPORTECH', '', '2025-10-03 14:32:05.933792+00'),
('950c5715-a90f-4368-ac19-2806e4915252', 'GRENE', '', '2025-10-03 14:32:05.933792+00'),
('fbfd51a1-be08-4fb5-92b6-876d6e2cdc9d', 'AVITA', '', '2025-10-03 14:32:05.933792+00'),
('90872af6-0b89-4589-91bb-33094283e135', 'DELAVAL', '', '2025-10-03 14:32:05.933792+00'),
('a4a23d31-75cc-4450-87c8-c5e9961b5a09', 'PASZA', '', '2025-10-03 14:32:05.933792+00'),
('dd2abc33-8224-43bc-99f5-b27157749948', 'KARMY', '', '2025-10-03 14:32:05.933792+00'),
('530ccbd7-60cc-44c3-b7bd-4784dcaa241d', 'ZOOLOGIA', '', '2025-10-03 14:32:05.933792+00'),
('6a1b6147-7c17-495a-a8e5-16a6b4d45f5f', 'GAD', '', '2025-10-03 14:32:05.933792+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. DANE - INVENTORIES
-- ============================================

INSERT INTO inventories (id, name, type, start_date, end_date, start_time, end_time, unit_name, unit_address, inventory_method, status, created_at, updated_at, user_id) VALUES
('1085556e-b161-4c39-b86d-5843f7f8f657', '2025', 'preliminary', NULL, NULL, NULL, NULL, '', '', 'ciągły', 'active', '2025-10-04 18:26:57.502511+00', '2025-10-04 18:26:57.502511+00', 'ca0e1370-aa88-4739-b343-b0b78d1c7699')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. INDEKSY I OPTYMALIZACJE
-- ============================================

-- Indeksy dla szybszego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL AND barcode != '';
CREATE INDEX IF NOT EXISTS idx_inventory_entries_inventory_id ON inventory_entries(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_entries_category_id ON inventory_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_final_inventory_entries_inventory_id ON final_inventory_entries(inventory_id);
CREATE INDEX IF NOT EXISTS idx_final_inventory_entries_category_id ON final_inventory_entries(category_id);

-- ============================================
-- 7. UWAGI DOTYCZĄCE MIGRACJI
-- ============================================

-- UWAGA 1: Dane produktów (products)
-- Tabela zawiera 60 produktów. Ze względu na dużą ilość danych,
-- eksport znajduje się w osobnym pliku: products_data.sql

-- UWAGA 2: Dane inwentaryzacji (inventory_entries)
-- Tabela zawiera 66 wpisów inwentaryzacyjnych.
-- Eksport znajduje się w osobnym pliku: inventory_entries_data.sql

-- UWAGA 3: Dane końcowej inwentaryzacji (final_inventory_entries)
-- Tabela zawiera 66 wpisów.
-- Eksport znajduje się w osobnym pliku: final_inventory_entries_data.sql

-- UWAGA 4: Hasła użytkowników
-- WAŻNE: Hasła w tabeli app_users są przechowywane w formie PLAIN TEXT!
-- Przed uruchomieniem w środowisku produkcyjnym należy:
-- 1. Zastosować odpowiednie hashowanie haseł (np. bcrypt)
-- 2. Zaktualizować kod aplikacji do obsługi hashowanych haseł

-- UWAGA 5: Row Level Security (RLS)
-- Niektóre tabele mają włączony RLS, ale brak polityk dostępu.
-- Należy zdefiniować odpowiednie polityki RLS przed uruchomieniem produkcyjnym.

-- ============================================
-- 8. KONFIGURACJA POŁĄCZENIA
-- ============================================

-- Połączenie z bazą danych PostgreSQL:
-- Host: [TWÓJ_HOST]
-- Port: 5432 (domyślny)
-- Database: [NAZWA_BAZY]
-- User: [UŻYTKOWNIK]
-- Password: [HASŁO]

-- Przykładowe połączenie:
-- psql -h localhost -p 5432 -U postgres -d inventory_db -f database_export.sql

-- ============================================
-- KONIEC EKSPORTU SCHEMATU
-- ============================================
