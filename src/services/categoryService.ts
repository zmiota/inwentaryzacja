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

  async create(name: string, description?: string): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, description: description || '' }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas tworzenia kategorii:', error);
      return null;
    }
  },

  async update(id: string, name: string, description?: string): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ name, description: description || '' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas aktualizacji kategorii:', error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd podczas usuwania kategorii:', error);
      return false;
    }
  }
};