export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  pku_w?: string;
  barcode?: string;
  unit: string;
  net_price?: number;
  invoice_number?: string;
  notes?: string;
  category_id?: string;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Inventory {
  id: string;
  name: string;
  type: 'preliminary' | 'final';
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  unit_name?: string;
  unit_address?: string;
  inventory_method?: string;
  status: 'active' | 'completed' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface CommissionMember {
  id: string;
  inventory_id: string;
  name: string;
  role: 'chairman' | 'member';
  is_present: boolean;
  signature_position?: string;
  created_at: string;
}

export interface InventoryEntry {
  id: string;
  inventory_id: string;
  category_id: string;
  pku_w?: string;
  product_name: string;
  unit: string;
  quantity: number;
  net_price: number;
  net_value: number;
  invoice_number?: string;
  barcode?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FinalInventoryEntry {
  id: string;
  inventory_id: string;
  sequence_number: number;
  row_number?: number;
  pku_w?: string;
  product_name: string;
  unit: string;
  quantity: number;
  net_price: number;
  net_value: number;
  barcode?: string;
  invoice_number?: string;
  notes?: string;
  category_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface OCRResult {
  product_name?: string;
  quantity?: number;
  price?: number;
  invoice_number?: string;
  confidence: number;
}