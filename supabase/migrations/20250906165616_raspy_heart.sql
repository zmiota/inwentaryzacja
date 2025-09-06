/*
  # Add PKU field to inventory entries

  1. Changes
    - Add `pku_w` column to `inventory_entries` table
    - This field stores PKU i W codes for inventory items
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_entries' AND column_name = 'pku_w'
  ) THEN
    ALTER TABLE inventory_entries ADD COLUMN pku_w text DEFAULT '';
  END IF;
END $$;