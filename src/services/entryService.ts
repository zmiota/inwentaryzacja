import { supabase } from '../lib/supabase';
import { InventoryEntry, FinalInventoryEntry } from '../types';

export const entryService = {
  // Inwentaryzacja wstępna
  async getPreliminaryEntries(inventoryId: string, categoryId?: string): Promise<InventoryEntry[]> {
    try {
      let query = supabase
        .from('inventory_entries')
        .select('*')
        .eq('inventory_id', inventoryId);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('created_at');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd podczas pobierania wpisów wstępnych:', error);
      return [];
    }
  },

  async createPreliminaryEntry(entry: Omit<InventoryEntry, 'id' | 'net_value' | 'created_at' | 'updated_at'>): Promise<InventoryEntry | null> {
    try {
      const { data, error } = await supabase
        .from('inventory_entries')
        .insert([entry])
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas tworzenia wpisu wstępnego:', error);
      return null;
    }
  },

  async updatePreliminaryEntry(id: string, updates: Partial<InventoryEntry>): Promise<InventoryEntry | null> {
    try {
      const { data, error } = await supabase
        .from('inventory_entries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas aktualizacji wpisu wstępnego:', error);
      return null;
    }
  },

  async deletePreliminaryEntry(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('inventory_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd podczas usuwania wpisu wstępnego:', error);
      return false;
    }
  },

  // Inwentaryzacja końcowa
  async getFinalEntries(inventoryId: string): Promise<FinalInventoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('final_inventory_entries')
        .select('*')
        .eq('inventory_id', inventoryId)
        .order('sequence_number');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd podczas pobierania wpisów końcowych:', error);
      return [];
    }
  },

  async generateFinalFromPreliminary(inventoryId: string): Promise<boolean> {
    try {
      // Pobierz wszystkie wpisy wstępne
      const { data: preliminaryEntries, error: fetchError } = await supabase
        .from('inventory_entries')
        .select('*')
        .eq('inventory_id', inventoryId)
        .order('category_id', { ascending: true });

      if (fetchError) throw fetchError;

      // Usuń istniejące wpisy końcowe
      const { error: deleteError } = await supabase
        .from('final_inventory_entries')
        .delete()
        .eq('inventory_id', inventoryId);

      if (deleteError) throw deleteError;

      if (!preliminaryEntries || preliminaryEntries.length === 0) return true;

      // Twórz wpisy końcowe z wpisów wstępnych
      const finalEntries = preliminaryEntries.map((entry, index) => ({
        inventory_id: inventoryId,
        sequence_number: index + 1,
        product_name: entry.product_name,
        unit: entry.unit,
        quantity: entry.quantity,
        net_price: entry.net_price,
        pku_w: entry.pku_w || '',
        barcode: entry.barcode || null,
        invoice_number: entry.invoice_number || null,
        notes: entry.notes || null,
        category_id: entry.category_id || null,
      }));

      const { error: insertError } = await supabase
        .from('final_inventory_entries')
        .insert(finalEntries);

      if (insertError) throw insertError;
      return true;
    } catch (error) {
      console.error('Błąd podczas generowania inwentaryzacji końcowej:', error);
      return false;
    }
  },

  async createFinalEntry(entry: Omit<FinalInventoryEntry, 'id' | 'net_value' | 'created_at' | 'updated_at'>): Promise<FinalInventoryEntry | null> {
    try {
      const { data, error } = await supabase
        .from('final_inventory_entries')
        .insert([entry])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas tworzenia wpisu końcowego:', error);
      return null;
    }
  },

  async updateFinalEntry(id: string, updates: Partial<FinalInventoryEntry>): Promise<FinalInventoryEntry | null> {
    try {
      const { data, error } = await supabase
        .from('final_inventory_entries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas aktualizacji wpisu końcowego:', error);
      return null;
    }
  },

  async deleteFinalEntry(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('final_inventory_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd podczas usuwania wpisu końcowego:', error);
      return false;
    }
  }
};