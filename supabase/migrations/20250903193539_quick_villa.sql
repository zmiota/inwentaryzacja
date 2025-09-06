/*
  # Fix inventory schema issues

  1. Database Schema Updates
    - Add missing `row_number` column to `final_inventory_entries` table
    - Add missing `product_id` column to `inventory_entries` table to enable proper relationships
    - Add foreign key constraint between `inventory_entries` and `products`
    - Add missing columns that the application expects

  2. Security
    - Maintain existing RLS policies
    - Ensure all tables have proper access controls

  3. Data Integrity
    - Add proper constraints and defaults
    - Ensure backward compatibility with existing data
*/

-- Add missing product_id column to inventory_entries if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_entries' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE inventory_entries ADD COLUMN product_id uuid REFERENCES products(id);
  END IF;
END $$;

-- Add missing columns to inventory_entries if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_entries' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE inventory_entries ADD COLUMN barcode text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_entries' AND column_name = 'notes'
  ) THEN
    ALTER TABLE inventory_entries ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_entries' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE inventory_entries ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add missing row_number column to final_inventory_entries if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'final_inventory_entries' AND column_name = 'row_number'
  ) THEN
    ALTER TABLE final_inventory_entries ADD COLUMN row_number integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add missing columns to final_inventory_entries if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'final_inventory_entries' AND column_name = 'source_entry_id'
  ) THEN
    ALTER TABLE final_inventory_entries ADD COLUMN source_entry_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'final_inventory_entries' AND column_name = 'is_manually_added'
  ) THEN
    ALTER TABLE final_inventory_entries ADD COLUMN is_manually_added boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'final_inventory_entries' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE final_inventory_entries ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;