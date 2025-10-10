import { supabase } from '../lib/supabase';
import { Inventory, InventoryEntry, FinalInventoryEntry, CommissionMember } from '../types';

export const inventoryService = {
  async getAll(): Promise<Inventory[]> {
    try {
      const { data, error } = await supabase
        .from('inventories')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd podczas pobierania inwentaryzacji:', error);
      return [];
    }
  },

  async getById(id: string): Promise<Inventory | null> {
    try {
      const { data, error } = await supabase
        .from('inventories')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Błąd podczas pobierania inwentaryzacji:', error);
      return null;
    }
  },

  async create(inventory: Omit<Inventory, 'id' | 'created_at' | 'updated_at'>): Promise<Inventory | null> {
    try {
      const storedUser = localStorage.getItem('app_user');
      if (!storedUser) throw new Error('Użytkownik nie jest zalogowany');

      const appUser = JSON.parse(storedUser);

      const { data, error } = await supabase
        .from('inventories')
        .insert([{ ...inventory, user_id: appUser.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas tworzenia inwentaryzacji:', error);
      return null;
    }
  },

  async update(id: string, updates: Partial<Inventory>): Promise<Inventory | null> {
    try {
      const { data, error } = await supabase
        .from('inventories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas aktualizacji inwentaryzacji:', error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('inventories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd podczas usuwania inwentaryzacji:', error);
      return false;
    }
  }
};