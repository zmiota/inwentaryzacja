/*
  # Add missing columns to products table

  1. Changes
    - Add invoice_number column to products table
    - Add notes column to products table
  
  2. Notes
    - These columns are optional and used for storing additional product information
    - invoice_number stores the invoice/document reference
    - notes stores additional product notes
*/

-- Add invoice_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN invoice_number text DEFAULT '';
  END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'notes'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;
