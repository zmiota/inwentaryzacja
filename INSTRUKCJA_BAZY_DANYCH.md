# Instrukcja konfiguracji bazy danych PostgreSQL

## Spis treści
1. [Wymagania](#wymagania)
2. [Instalacja bazy danych](#instalacja-bazy-danych)
3. [Konfiguracja aplikacji](#konfiguracja-aplikacji)
4. [Struktura bazy danych](#struktura-bazy-danych)
5. [Zapytania przydatne](#zapytania-przydatne)

## Wymagania

- PostgreSQL 12 lub nowszy
- Dostęp do konsoli PostgreSQL (psql) lub narzędzie graficzne (pgAdmin, DBeaver)

## Instalacja bazy danych

### Metoda 1: Użycie pliku SQL (Zalecana)

1. **Utwórz nową bazę danych** (jeśli jeszcze nie istnieje):
```bash
createdb inwentaryzacja
```

Lub w konsoli PostgreSQL:
```sql
CREATE DATABASE inwentaryzacja;
```

2. **Uruchom skrypt instalacyjny**:
```bash
psql -U postgres -d inwentaryzacja -f database_setup.sql
```

Gdzie:
- `-U postgres` - użytkownik PostgreSQL (zmień na swojego użytkownika)
- `-d inwentaryzacja` - nazwa bazy danych
- `-f database_setup.sql` - plik ze skryptem

### Metoda 2: Ręczne wykonanie w pgAdmin lub DBeaver

1. Otwórz narzędzie do zarządzania bazą danych
2. Połącz się z serwerem PostgreSQL
3. Utwórz nową bazę danych o nazwie `inwentaryzacja`
4. Otwórz plik `database_setup.sql`
5. Wykonaj cały skrypt

## Konfiguracja aplikacji

### Dla bezpośredniego połączenia PostgreSQL

Jeśli chcesz połączyć się bezpośrednio z PostgreSQL (bez Supabase), musisz:

1. **Zainstalować odpowiedni klient PostgreSQL** dla JavaScript/TypeScript
2. **Zaktualizować plik `.env`** z danymi połączenia:

```env
# Dane połączenia PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inwentaryzacja
DB_USER=postgres
DB_PASSWORD=twoje_haslo
```

3. **Utworzyć plik połączenia** (np. `src/lib/database.ts`):

```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
```

### Dla Supabase (Obecnie używane)

Aplikacja jest już skonfigurowana do pracy z Supabase. Dane połączenia są w pliku `.env`:

```env
VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=twoj_klucz_anonimowy
```

Migracje znajdują się w katalogu `supabase/migrations/`.

## Struktura bazy danych

### Tabele główne

#### 1. `inventories` - Inwentaryzacje
Przechowuje główne rekordy inwentaryzacji.

**Kolumny:**
- `id` (uuid) - Unikalny identyfikator
- `name` (text) - Nazwa inwentaryzacji
- `type` (text) - Typ: 'preliminary' lub 'final'
- `start_date` (date) - Data rozpoczęcia
- `end_date` (date) - Data zakończenia
- `start_time` (time) - Godzina rozpoczęcia
- `end_time` (time) - Godzina zakończenia
- `unit_name` (text) - Nazwa jednostki
- `unit_address` (text) - Adres jednostki
- `inventory_method` (text) - Metoda inwentaryzacji
- `status` (text) - Status: 'active', 'completed', 'archived'
- `created_at` (timestamptz) - Data utworzenia
- `updated_at` (timestamptz) - Data ostatniej aktualizacji

#### 2. `categories` - Kategorie
Przechowuje kategorie produktów.

**Kolumny:**
- `id` (uuid) - Unikalny identyfikator
- `name` (text) - Nazwa kategorii (unikalna)
- `description` (text) - Opis kategorii
- `created_at` (timestamptz) - Data utworzenia

**Domyślne kategorie:**
AGD, DES, OZDOBY CHOINKOWE, KAPTURSCY, ZNICZE, SZTUCZNE OGNIE, CHEMPAK, OGRODNICTWO, NAWOZY, PODSTAWKI, NARZĘDZIA, DONICZKI, NASIONA, KORYTKA, KOTWICE, ZANĘTY, OŁÓWKI, GŁÓWKI, DODATKI ZANĘTOWE, ŻYŁKI, GUMY, HACZYKI, BLACHY, SPŁAWIKI, AKCESORIA WĘDKARSKIE, DOLFOSY, DOBRZYCA, JASZYM, BARSZCZ, BATERIE, SPORTECH, GRENE, AVITA, DELAVAL, PASZA, KARMY, ZOOLOGIA, GAD

#### 3. `products` - Produkty
Przechowuje produkty z kodami kreskowymi.

**Kolumny:**
- `id` (uuid) - Unikalny identyfikator
- `name` (text) - Nazwa produktu
- `barcode` (text) - Kod kreskowy (unikalny)
- `pku_w` (text) - Kod PKU i W
- `unit` (text) - Jednostka miary (szt, kg, l)
- `net_price` (decimal) - Cena netto
- `category_id` (uuid) - Powiązanie z kategorią
- `created_at` (timestamptz) - Data utworzenia
- `updated_at` (timestamptz) - Data ostatniej aktualizacji

#### 4. `inventory_entries` - Wpisy inwentaryzacji wstępnej
Przechowuje wpisy inwentaryzacji wstępnej.

**Kolumny:**
- `id` (uuid) - Unikalny identyfikator
- `inventory_id` (uuid) - Powiązanie z inwentaryzacją
- `category_id` (uuid) - Powiązanie z kategorią
- `product_name` (text) - Nazwa produktu
- `pku_w` (text) - Kod PKU i W
- `unit` (text) - Jednostka miary
- `quantity` (decimal) - Ilość
- `net_price` (decimal) - Cena netto
- `net_value` (decimal) - Wartość netto (obliczana: quantity × net_price)
- `invoice_number` (text) - Numer faktury
- `barcode` (text) - Kod kreskowy
- `notes` (text) - Uwagi
- `created_at` (timestamptz) - Data utworzenia
- `updated_at` (timestamptz) - Data ostatniej aktualizacji

#### 5. `final_inventory_entries` - Wpisy inwentaryzacji końcowej
Przechowuje wpisy inwentaryzacji końcowej.

**Kolumny:**
- `id` (uuid) - Unikalny identyfikator
- `inventory_id` (uuid) - Powiązanie z inwentaryzacją
- `sequence_number` (integer) - Numer sekwencyjny
- `row_number` (integer) - Numer wiersza
- `pku_w` (text) - Kod PKU i W
- `product_name` (text) - Nazwa produktu
- `unit` (text) - Jednostka miary
- `quantity` (decimal) - Ilość
- `net_price` (decimal) - Cena netto
- `net_value` (decimal) - Wartość netto (obliczana: quantity × net_price)
- `created_at` (timestamptz) - Data utworzenia
- `updated_at` (timestamptz) - Data ostatniej aktualizacji

## Zapytania przydatne

### Wyświetl wszystkie kategorie
```sql
SELECT * FROM categories ORDER BY name;
```

### Wyświetl wszystkie inwentaryzacje
```sql
SELECT
  id,
  name,
  type,
  status,
  start_date,
  end_date
FROM inventories
ORDER BY created_at DESC;
```

### Wyświetl wpisy dla konkretnej inwentaryzacji
```sql
SELECT
  ie.product_name,
  c.name as kategoria,
  ie.quantity,
  ie.unit,
  ie.net_price,
  ie.net_value
FROM inventory_entries ie
JOIN categories c ON ie.category_id = c.id
WHERE ie.inventory_id = 'ID_INWENTARYZACJI'
ORDER BY c.name, ie.product_name;
```

### Suma wartości dla inwentaryzacji
```sql
SELECT
  SUM(net_value) as suma_wartosci
FROM inventory_entries
WHERE inventory_id = 'ID_INWENTARYZACJI';
```

### Wyświetl produkty z kodami kreskowymi
```sql
SELECT
  p.name,
  p.barcode,
  p.pku_w,
  p.unit,
  p.net_price,
  c.name as kategoria
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.name;
```

### Znajdź produkt po kodzie kreskowym
```sql
SELECT * FROM products
WHERE barcode = 'TWOJ_KOD_KRESKOWY';
```

### Statystyki inwentaryzacji
```sql
SELECT
  i.name,
  COUNT(ie.id) as liczba_wpisow,
  SUM(ie.net_value) as calkowita_wartosc
FROM inventories i
LEFT JOIN inventory_entries ie ON i.id = ie.inventory_id
GROUP BY i.id, i.name
ORDER BY i.created_at DESC;
```

### Dodaj nową kategorię
```sql
INSERT INTO categories (name, description)
VALUES ('NOWA KATEGORIA', 'Opis kategorii');
```

### Dodaj nowy produkt
```sql
INSERT INTO products (name, barcode, pku_w, unit, net_price, category_id)
VALUES (
  'Nazwa produktu',
  '1234567890123',
  'PKU123',
  'szt',
  49.99,
  (SELECT id FROM categories WHERE name = 'AGD' LIMIT 1)
);
```

### Eksportuj dane do CSV (w psql)
```sql
\copy (SELECT * FROM inventory_entries) TO '/ścieżka/do/pliku.csv' WITH CSV HEADER;
```

## Backup i restore

### Backup całej bazy danych
```bash
pg_dump -U postgres inwentaryzacja > backup.sql
```

### Restore z backup
```bash
psql -U postgres inwentaryzacja < backup.sql
```

### Backup tylko danych (bez struktury)
```bash
pg_dump -U postgres --data-only inwentaryzacja > data_backup.sql
```

## Rozwiązywanie problemów

### Problem: "relation already exists"
Jeśli tabele już istnieją, skrypt nie spowoduje błędu dzięki `IF NOT EXISTS`.

### Problem: Brak uprawnień
Upewnij się, że użytkownik ma uprawnienia do tworzenia tabel:
```sql
GRANT ALL PRIVILEGES ON DATABASE inwentaryzacja TO twoj_uzytkownik;
```

### Problem: Nie można połączyć się z bazą
Sprawdź plik konfiguracyjny PostgreSQL `pg_hba.conf` i upewnij się, że metoda uwierzytelniania jest poprawna.

## Kontakt i wsparcie

W razie pytań lub problemów, skontaktuj się z administratorem systemu.
