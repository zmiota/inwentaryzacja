# Przewodnik Audit Log

## Przegląd

System automatycznie loguje wszystkie działania użytkowników i zmiany w bazie danych do tabeli `audit_log`.

---

## Automatyczne Logowanie

### Co jest logowane?

1. **Zmiany w danych:**
   - INSERT - Nowe rekordy
   - UPDATE - Modyfikacje
   - DELETE - Usunięcia

2. **Działania użytkowników:**
   - LOGIN - Logowanie do systemu
   - REGISTER - Rejestracja nowego użytkownika
   - PASSWORD_MIGRATION - Migracja hasła do bcrypt
   - USER_UPDATE - Aktualizacja danych użytkownika
   - AUDIT_CLEANUP - Automatyczne czyszczenie starych logów

3. **Tabele monitorowane:**
   - `inventories`
   - `inventory_entries`
   - `final_inventory_entries`
   - `products`
   - `categories`
   - `app_users`

---

## Struktura Tabeli audit_log

```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY,
  user_id uuid,                 -- Kto wykonał akcję
  action text,                  -- Typ akcji (INSERT, UPDATE, DELETE, LOGIN, etc.)
  table_name text,              -- Której tabeli dotyczy
  record_id uuid,               -- ID zmienionego rekordu
  old_data jsonb,               -- Dane przed zmianą
  new_data jsonb,               -- Dane po zmianie
  ip_address text,              -- Adres IP użytkownika
  created_at timestamptz        -- Kiedy nastąpiła zmiana
);
```

---

## Automatyczne Czyszczenie

### Konfiguracja
- **Retencja:** 72 godziny (3 dni)
- **Częstotliwość:** Codziennie o 3:00
- **Mechanizm:** pg_cron scheduled job

### Jak to działa?

1. Codziennie o 3:00 uruchamia się funkcja `cleanup_old_audit_logs()`
2. Funkcja usuwa wszystkie logi starsze niż 72 godziny
3. Dodaje wpis do audit_log z informacją ile rekordów usunięto

### Ręczne uruchomienie

Jeśli chcesz wyczyścić logi ręcznie:

```sql
SELECT cleanup_old_audit_logs();
```

Funkcja zwraca liczbę usuniętych rekordów.

### Zmiana czasu retencji

Jeśli chcesz zachować logi dłużej/krócej, edytuj funkcję:

```sql
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Zmień '72 hours' na np. '168 hours' (7 dni) lub '24 hours' (1 dzień)
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '72 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  INSERT INTO audit_log (
    user_id, action, table_name, record_id, new_data, ip_address
  )
  VALUES (
    NULL, 'AUDIT_CLEANUP', 'audit_log', NULL,
    jsonb_build_object('deleted_count', deleted_count, 'older_than_hours', 72),
    'system'
  );

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Zmiana harmonogramu

Zmień częstotliwość czyszczenia:

```sql
-- Usuń stary job
SELECT cron.unschedule('cleanup-audit-logs');

-- Dodaj nowy (np. co 12 godzin)
SELECT cron.schedule(
  'cleanup-audit-logs',
  '0 */12 * * *',  -- Co 12 godzin
  'SELECT cleanup_old_audit_logs();'
);
```

Przykłady cron schedule:
- `'0 3 * * *'` - Codziennie o 3:00
- `'0 */12 * * *'` - Co 12 godzin
- `'0 0 * * 0'` - Raz w tygodniu (niedziela o północy)
- `'0 0 1 * *'` - Raz w miesiącu (1. dnia o północy)

---

## Przykładowe Zapytania

### 1. Zobacz ostatnie logowania

```sql
SELECT
  au.login,
  al.ip_address,
  al.created_at
FROM audit_log al
LEFT JOIN app_users au ON al.user_id = au.id
WHERE al.action = 'LOGIN'
ORDER BY al.created_at DESC
LIMIT 20;
```

### 2. Zobacz kto zmienił konkretną inwentaryzację

```sql
SELECT
  au.login as user_name,
  al.action,
  al.old_data,
  al.new_data,
  al.created_at
FROM audit_log al
LEFT JOIN app_users au ON al.user_id = au.id
WHERE al.table_name = 'inventories'
  AND al.record_id = 'TUTAJ_ID_INWENTARYZACJI'
ORDER BY al.created_at DESC;
```

### 3. Zobacz wszystkie zmiany przez użytkownika

```sql
SELECT
  al.action,
  al.table_name,
  al.created_at,
  al.ip_address
FROM audit_log al
WHERE al.user_id = 'TUTAJ_ID_UZYTKOWNIKA'
ORDER BY al.created_at DESC
LIMIT 50;
```

### 4. Zobacz usunięte produkty (ostatnie 72h)

```sql
SELECT
  au.login as deleted_by,
  al.old_data->>'name' as product_name,
  al.old_data->>'barcode' as barcode,
  al.created_at
FROM audit_log al
LEFT JOIN app_users au ON al.user_id = au.id
WHERE al.action = 'DELETE'
  AND al.table_name = 'products'
ORDER BY al.created_at DESC;
```

### 5. Zobacz statystyki działań

```sql
SELECT
  action,
  COUNT(*) as count
FROM audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action
ORDER BY count DESC;
```

### 6. Zobacz historię czyszczenia

```sql
SELECT
  new_data->>'deleted_count' as deleted_records,
  created_at
FROM audit_log
WHERE action = 'AUDIT_CLEANUP'
ORDER BY created_at DESC
LIMIT 10;
```

### 7. Zobacz aktywność w czasie

```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as activity_count
FROM audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### 8. Zobacz top aktywnych użytkowników

```sql
SELECT
  au.login,
  COUNT(*) as actions_count
FROM audit_log al
LEFT JOIN app_users au ON al.user_id = au.id
WHERE al.created_at > NOW() - INTERVAL '24 hours'
  AND au.login IS NOT NULL
GROUP BY au.login
ORDER BY actions_count DESC
LIMIT 10;
```

---

## Analiza Bezpieczeństwa

### Wykryj podejrzaną aktywność

```sql
-- Wiele nieudanych prób logowania z tego samego IP
SELECT
  ip_address,
  COUNT(*) as attempts,
  MAX(created_at) as last_attempt
FROM audit_log
WHERE action = 'LOGIN'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY attempts DESC;
```

### Wykryj masowe usunięcia

```sql
-- Użytkownicy, którzy usunęli wiele rekordów
SELECT
  au.login,
  al.table_name,
  COUNT(*) as deleted_count,
  MIN(al.created_at) as first_delete,
  MAX(al.created_at) as last_delete
FROM audit_log al
LEFT JOIN app_users au ON al.user_id = au.id
WHERE al.action = 'DELETE'
  AND al.created_at > NOW() - INTERVAL '24 hours'
GROUP BY au.login, al.table_name
HAVING COUNT(*) > 10
ORDER BY deleted_count DESC;
```

---

## Export Logów

### Do CSV

```sql
COPY (
  SELECT
    au.login,
    al.action,
    al.table_name,
    al.created_at,
    al.ip_address
  FROM audit_log al
  LEFT JOIN app_users au ON al.user_id = au.id
  WHERE al.created_at > NOW() - INTERVAL '24 hours'
  ORDER BY al.created_at DESC
) TO '/tmp/audit_log_export.csv' WITH CSV HEADER;
```

### Do JSON

```sql
SELECT json_agg(row_to_json(t))
FROM (
  SELECT
    au.login,
    al.action,
    al.table_name,
    al.created_at,
    al.ip_address
  FROM audit_log al
  LEFT JOIN app_users au ON al.user_id = au.id
  WHERE al.created_at > NOW() - INTERVAL '24 hours'
  ORDER BY al.created_at DESC
) t;
```

---

## Przywracanie Danych

Możesz użyć audit_log do przywrócenia usuniętych danych:

```sql
-- Przykład: Przywróć usunięty produkt
INSERT INTO products
SELECT (old_data->>'id')::uuid,
       old_data->>'name',
       old_data->>'barcode',
       (old_data->>'net_price')::numeric,
       (old_data->>'category_id')::uuid,
       NOW(), -- created_at
       NOW()  -- updated_at
FROM audit_log
WHERE action = 'DELETE'
  AND table_name = 'products'
  AND record_id = 'TUTAJ_ID_PRODUKTU';
```

**UWAGA:** Sprawdź czy dane są poprawne przed przywróceniem!

---

## Rozwiązywanie Problemów

### Audit log zajmuje za dużo miejsca

Jeśli retencja 72h to za dużo:

```sql
-- Zmniejsz do 24h
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
BEGIN
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '24 hours';
  -- ... reszta funkcji
END;
$$ LANGUAGE plpgsql;
```

### Czyszczenie nie działa automatycznie

Sprawdź status pg_cron:

```sql
-- Zobacz zaplanowane joby
SELECT * FROM cron.job;

-- Zobacz historię wykonań
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

Jeśli job nie istnieje, dodaj go ponownie:

```sql
SELECT cron.schedule(
  'cleanup-audit-logs',
  '0 3 * * *',
  'SELECT cleanup_old_audit_logs();'
);
```

### Wyłącz czyszczenie

Jeśli chcesz zachować wszystkie logi:

```sql
SELECT cron.unschedule('cleanup-audit-logs');
```

---

## Best Practices

1. **Regularnie przeglądaj logi** - Sprawdzaj podejrzaną aktywność
2. **Eksportuj ważne logi** - Przed czyszczeniem zapisz krytyczne informacje
3. **Monitoruj rozmiar tabeli** - `SELECT pg_size_pretty(pg_table_size('audit_log'));`
4. **Dostosuj retencję** - Do swoich potrzeb biznesowych
5. **Używaj indeksów** - Logi mają już indeksy dla szybkich zapytań

---

## Zgodność z Regulacjami

Audit log pomaga w zgodności z:
- **GDPR** - Śledzenie kto i kiedy miał dostęp do danych
- **ISO 27001** - Wymagania audytu bezpieczeństwa
- **Audit trails** - Wymagane przez wiele regulacji

**Retencja 72h** jest minimalna dla większości zastosowań. W przypadku wymogów prawnych może być potrzebne wydłużenie do 30-90 dni.
