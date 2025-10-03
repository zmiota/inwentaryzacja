/*
  # Add missing fields to final_inventory_entries table

  1. Changes
    - Add `barcode` field (text, optional) - kod kreskowy produktu
    - Add `invoice_number` field (text, optional) - numer faktury/inwentu
    - Add `notes` field (text, optional) - uwagi
    
  2. Purpose
    - Ujednolicenie pól między preliminary_inventory_entries i final_inventory_entries
    - Wszystkie trzy zakładki (Produkty, Inwentaryzacja wstępna, Inwentaryzacja końcowa) będą używać tych samych pól
*/

-- Add barcode field if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'final_inventory_entries' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE final_inventory_entries ADD COLUMN barcode text;
  END IF;
END $$;

-- Add invoice_number field if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'final_inventory_entries' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE final_inventory_entries ADD COLUMN invoice_number text;
  END IF;
END $$;

-- Add notes field if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'final_inventory_entries' AND column_name = 'notes'
  ) THEN
    ALTER TABLE final_inventory_entries ADD COLUMN notes text;
  END IF;
END $$;