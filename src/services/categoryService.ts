import { supabase } from '../lib/supabase';
import { Category } from '../types';

export const categoryService = {
  async getAll(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd podczas pobierania kategorii:', error);
      return [];
    }
  },

  async create(name: string, displayOrder: number): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, description: '' }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas tworzenia kategorii:', error);
      return null;
    }
  }
};