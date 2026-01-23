# Analiza Bezpieczeństwa - System Inwentaryzacji

## Zaimplementowane Poprawki (bez wpływu na logikę)

### ✅ Zakończone
1. **Indeksy na Foreign Keys** - Poprawiona wydajność zapytań
2. **CHECK Constraints** - Walidacja danych (quantity >= 0, net_price >= 0)
3. **ON DELETE CASCADE** - Właściwe usuwanie powiązanych rekordów
4. **Automatyczne Triggery** - Aktualizacja `updated_at` automatycznie
5. **RLS z politykami public** - Włączone RLS bez blokowania dostępu

## Pozostałe Luki Bezpieczeństwa (wymagają zmian w kodzie)

### 🔴 KRYTYCZNE

#### 1. Hasła przechowywane jako Plain Text
**Problem:**
- Kolumna `password_hash` przechowuje hasła w postaci jawnej
- Każdy z dostępem do bazy widzi wszystkie hasła

**Rozwiązanie:**
- Wdrożyć proper hashing (bcrypt/argon2) po stronie backendu
- Stworzyć Edge Function dla logowania
- Migrować istniejące hasła

**Przykładowa implementacja:**
```typescript
// Edge Function: login
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req: Request) => {
  const { login, password } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  const { data: user } = await supabase
    .from('app_users')
    .select('*')
    .eq('login', login)
    .maybeSingle();

  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401
    });
  }

  // Generate JWT token here
  return new Response(JSON.stringify({ user }));
});
```

#### 2. Brak Session Management
**Problem:**
- Dane użytkownika w localStorage mogą być łatwo zmanipulowane
- Brak wygasania sesji
- Każdy z dostępem do localStorage ma pełen dostęp

**Rozwiązanie:**
- Przejść na JWT tokeny z expiration time
- Przechowywać tokeny w httpOnly cookies
- Implementować refresh tokens

### 🟡 WYSOKIE

#### 3. Brak Rate Limiting na Login
**Problem:**
- Możliwe ataki brute force na logowanie
- Brak limitów prób logowania

**Rozwiązanie:**
- Dodać Edge Function z rate limiting
- Używać Supabase Edge Functions z built-in rate limiting
- Dodać CAPTCHA po kilku nieudanych próbach

#### 4. Brak Audytu Działań
**Problem:**
- Nie ma logów kto co zmienił
- Niemożliwe śledzenie zmian

**Rozwiązanie:**
```sql
-- Tabela audit log
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Trigger function dla audytu
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (action, table_name, record_id, old_data)
    VALUES ('DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (action, table_name, record_id, old_data, new_data)
    VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (action, table_name, record_id, new_data)
    VALUES ('INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 🟢 ŚREDNIE

#### 5. Brak Walidacji Email/Login Format
**Problem:**
- Login może zawierać SQL injection próby (mimo że Supabase chroni)
- Brak walidacji formatu

**Rozwiązanie:**
```sql
ALTER TABLE app_users
  ADD CONSTRAINT check_login_format
  CHECK (login ~ '^[a-zA-Z0-9_.-]+$' AND length(login) >= 3);
```

#### 6. Brak HTTPS Enforcement
**Problem:**
- Połączenia mogą być niezabezpieczone

**Rozwiązanie:**
- Upewnić się że aplikacja wymusza HTTPS
- Dodać HSTS headers

#### 7. Brak CSP Headers
**Problem:**
- Brak Content Security Policy
- Możliwe ataki XSS

**Rozwiązanie:**
```typescript
// W vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline';"
    }
  }
});
```

## Plan Migracji do Bezpiecznego Systemu

### Faza 1: Przygotowanie (bez wpływu na produkcję)
1. Stworzyć Edge Function dla logowania z proper hashingiem
2. Dodać nową kolumnę `password_hash_bcrypt` do tabeli app_users
3. Przygotować skrypt migracji haseł

### Faza 2: Migracja Haseł
1. Uruchomić skrypt migrujący hasła do bcrypt
2. Zweryfikować że wszystkie hasła zostały zmigrowane
3. Backup starej kolumny password_hash

### Faza 3: Wdrożenie Nowego Auth
1. Zaktualizować frontend do używania Edge Function
2. Wdrożyć JWT tokens
3. Dodać refresh token mechanism

### Faza 4: Cleanup
1. Usunąć starą kolumnę password_hash
2. Zaktualizować wszystkie polityki RLS
3. Dodać audit logging

## Rekomendacje Natychmiastowe

### Możesz zrobić teraz bez psujące logiki:
1. ✅ Dodać indeksy (ZROBIONE)
2. ✅ Dodać constraints (ZROBIONE)
3. ✅ Dodać triggery (ZROBIONE)
4. Dodać audit logging (wymaga tylko dodania tabeli)
5. Dodać walidację formatu login

### Wymaga zmian w kodzie:
1. Migracja do hashowanych haseł
2. Implementacja JWT tokens
3. Rate limiting na login
4. Session management

## Obecny Stan Bezpieczeństwa

**Dobre:**
- ✅ RLS włączony
- ✅ Indeksy na FK
- ✅ Data validation constraints
- ✅ Proper CASCADE behavior
- ✅ Automatic timestamps

**Do poprawy:**
- ❌ Plain text passwords
- ❌ Brak session management
- ❌ Brak rate limiting
- ❌ Brak audit trail
- ❌ LocalStorage authentication

## Punkt Przywracania

Aby wrócić do obecnego stanu (RLS włączony, wszystkie poprawki):
```sql
-- Przywrócenie do migracji:
-- 20260123102727_enable_rls_with_public_access.sql
-- oraz wszystkie późniejsze migracje
```

Aby całkowicie wyłączyć RLS (jeśli coś nie działa):
```sql
ALTER TABLE inventories DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE final_inventory_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
```
