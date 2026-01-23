# Przewodnik Migracji Haseł

## Przegląd

System został zaktualizowany o bezpieczne hashowanie haseł z użyciem bcrypt. Ten przewodnik pomoże ci zmigrować istniejące hasła.

## WAŻNE: Przed Migracją

1. **Wykonaj backup bazy danych** - zawsze twórz kopię zapasową przed migracją
2. **Zapisz swoje hasło** - będziesz musiał zalogować się po migracji używając tego samego hasła
3. **Migracja jest jednorazowa** - po zmigrowanych hasłach nie można wrócić do starych

## Krok 1: Zmigruj Istniejące Hasła

Użyj Edge Function do automatycznej migracji wszystkich istniejących haseł:

```bash
# Wywołaj Edge Function do migracji
curl -X POST \
  "${VITE_SUPABASE_URL}/functions/v1/migrate-passwords" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json"
```

Lub użyj narzędzia graficznego:

1. Otwórz Supabase Dashboard
2. Przejdź do Edge Functions
3. Znajdź funkcję `migrate-passwords`
4. Wywołaj funkcję (nie wymaga parametrów)

## Krok 2: Zweryfikuj Migrację

Sprawdź status migracji w bazie danych:

```sql
-- Sprawdź ile użytkowników zostało zmigrowanych
SELECT
  COUNT(*) FILTER (WHERE password_is_hashed = true) as migrated,
  COUNT(*) FILTER (WHERE password_is_hashed = false) as not_migrated,
  COUNT(*) as total
FROM app_users;
```

## Krok 3: Przetestuj Logowanie

1. Wyloguj się z aplikacji
2. Zaloguj się używając swojego oryginalnego hasła
3. System automatycznie użyje zahashowanego hasła

## Jak to Działa

### Przed Migracją
- Hasła przechowywane jako plain text w kolumnie `password_hash`
- Pole `password_is_hashed` = `false`

### Po Migracji
- Hasła przechowywane jako bcrypt hash
- Pole `password_is_hashed` = `true`
- Nie można odwrócić procesu

### Proces Migracji

1. Edge Function pobiera wszystkich użytkowników z `password_is_hashed = false`
2. Dla każdego użytkownika:
   - Pobiera plain text hasło
   - Tworzy bcrypt hash (salt rounds: 10)
   - Aktualizuje `password_hash` z nowym hashem
   - Ustawia `password_is_hashed = true`
   - Dodaje wpis do audit_log

## Nowi Użytkownicy

Nowi użytkownicy tworzeni po wdrożeniu będą automatycznie mieli hasła hashowane. Nie wymagają migracji.

## Aktualizacja Hasła

Gdy użytkownik zmienia hasło poprzez formularz edycji:
1. Nowe hasło jest automatycznie hashowane
2. Zapisywane jest jako bcrypt hash
3. `password_is_hashed` ustawiane na `true`

## Troubleshooting

### Nie mogę się zalogować po migracji

**Problem:** Hasło nie działa po migracji

**Rozwiązanie:**
1. Sprawdź czy migracja się powiodła dla twojego użytkownika:
   ```sql
   SELECT login, password_is_hashed
   FROM app_users
   WHERE login = 'twoj_login';
   ```
2. Jeśli `password_is_hashed = false`, uruchom migrację ponownie
3. Jeśli nadal nie działa, administrator może zresetować hasło przez panel zarządzania

### Niektórzy użytkownicy nie zostali zmigrowane

**Problem:** Częściowa migracja

**Rozwiązanie:**
1. Uruchom Edge Function ponownie - przetwarzane są tylko użytkownicy z `password_is_hashed = false`
2. Sprawdź logi Edge Function w Supabase Dashboard

### Chcę cofnąć migrację

**Problem:** Potrzebuję wrócić do starych haseł

**Rozwiązanie:**
- NIE MA możliwości cofnięcia - bcrypt jest jednokierunkowy
- Jedyne rozwiązanie: zresetować hasła wszystkim użytkownikom
- Dlatego ZAWSZE rób backup przed migracją

## Audit Trail

Wszystkie działania związane z migracją są logowane w tabeli `audit_log`:

```sql
-- Zobacz logi migracji
SELECT
  user_id,
  action,
  created_at
FROM audit_log
WHERE action = 'PASSWORD_MIGRATION'
ORDER BY created_at DESC;
```

## Bezpieczeństwo

Po migracji:
- ✅ Hasła są bezpiecznie hashowane z bcrypt (salt rounds: 10)
- ✅ Niemożliwe odtworzenie oryginalnego hasła
- ✅ Każda zmiana hasła jest auditowana
- ✅ Login wykorzystuje Edge Function z rate limiting
- ✅ Rejestracja wymaga minimum 6 znaków
- ✅ Format loginu jest walidowany (alfanumeryczne, 3-50 znaków)

## Wsparcie

Jeśli masz problemy:
1. Sprawdź audit_log dla swoich działań
2. Sprawdź logi Edge Functions w Supabase Dashboard
3. Skontaktuj się z administratorem systemu
