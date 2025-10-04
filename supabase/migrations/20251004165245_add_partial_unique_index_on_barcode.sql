/*
  # Add partial unique index on barcode field

  1. Changes
    - Create a partial unique index on products.barcode
    - Index only applies when barcode IS NOT NULL AND barcode != ''
    - This allows multiple products with NULL or empty barcode
    - But enforces uniqueness for actual barcode values

  2. Reasoning
    - Multiple products without barcodes should be allowed (NULL values)
    - Products with actual barcode values must have unique codes
    - Prevents duplicate barcodes like '1111' appearing twice
*/

-- Create partial unique index on barcode (only when not null and not empty)
CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_unique_idx 
ON products (barcode) 
WHERE barcode IS NOT NULL AND barcode != '';
