/*
  # Remove unique constraint from barcode field

  1. Changes
    - Remove UNIQUE constraint from products.barcode column
    - This allows multiple products to have NULL/empty barcode values
    - Barcode is optional and should not be enforced as unique

  2. Reasoning
    - Not all products have barcodes
    - Multiple products without barcodes should be allowed
    - Barcode is an optional field for product identification
*/

-- Remove the unique constraint from barcode column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'products_barcode_key'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT products_barcode_key;
  END IF;
END $$;
