import { supabase } from '../lib/supabase';
import { Product } from '../types';

export const productService = {
  async search(query: string, categoryId?: string): Promise<Product[]> {
    try {
      let queryBuilder = supabase
        .from('products')
        .select('*, category:categories(*)');

      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,barcode.ilike.%${query}%`);
      }

      queryBuilder = queryBuilder
        .limit(10);

      if (categoryId) {
        queryBuilder = queryBuilder.eq('category_id', categoryId);
      }

      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd podczas wyszukiwania produktów:', error);
      return [];
    }
  },

  async getByBarcode(barcode: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('barcode', barcode)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Błąd podczas pobierania produktu po kodzie kreskowym:', error);
      return null;
    }
  },

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select('*, category:categories(*)')
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas tworzenia produktu:', error);
      return null;
    }
  },

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, category:categories(*)')
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas aktualizacji produktu:', error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd podczas usuwania produktu:', error);
      return false;
    }
  }
};