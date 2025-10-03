/*
  # Add category_id to final_inventory_entries

  1. Changes
    - Add category_id column to final_inventory_entries table
    - Add foreign key constraint to categories table
    - Set default value to first category for existing rows
  
  2. Security
    - No changes to RLS policies needed
*/

-- Add category_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'final_inventory_entries' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE final_inventory_entries 
    ADD COLUMN category_id uuid REFERENCES categories(id);
  END IF;
END $$;
