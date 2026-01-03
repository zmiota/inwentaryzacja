import { supabase } from '../lib/supabase';
import { InventoryEntry, FinalInventoryEntry } from '../types';

export const entryService = {
  // Inwentaryzacja wstępna - POPRAWIONA FUNKCJA Z OBSŁUGĄ PAGINACJI
  async getPreliminaryEntries(
    inventoryId: string, 
    categoryId?: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<InventoryEntry[]> {
    try {
      let query = supabase
        .from('inventory_entries')
        .select('*')
        .eq('inventory_id', inventoryId);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      // RANGE jest kluczowe dla paginacji w Supabase
      // offset to start, offset + limit - 1 to koniec (np. 0 do 49 dla pierwszej paczki)
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd podczas pobierania wpisów wstępnych:', error);
      return [];
    }
  },

  // ... reszta funkcji (create, update, delete, getFinalEntries, itd.) pozostaje bez zmian ...
  // Upewnij się tylko, że eksportujesz cały obiekt entryService tak jak wcześniej
  async createPreliminaryEntry(entry: Omit<InventoryEntry, 'id' | 'net_value' | 'created_at' | 'updated_at'>): Promise<InventoryEntry | null> {
    try {
      const { data, error } = await supabase.from('inventory_entries').insert([entry]).select('*').single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd:', error);
      return null;
    }
  },

  async updatePreliminaryEntry(id: string, updates: Partial<InventoryEntry>): Promise<InventoryEntry | null> {
    try {
      const { data, error } = await supabase.from('inventory_entries').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd:', error);
      return null;
    }
  },

  async deletePreliminaryEntry(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('inventory_entries').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd:', error);
      return false;
    }
  },

  async getFinalEntries(inventoryId: string): Promise<FinalInventoryEntry[]> {
    try {
      const { data, error } = await supabase.from('final_inventory_entries').select('*').eq('inventory_id', inventoryId).order('sequence_number');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd:', error);
      return [];
    }
  },

  async generateFinalFromPreliminary(inventoryId: string): Promise<boolean> {
    try {
      const { data: preliminaryEntries, error: fetchError } = await supabase.from('inventory_entries').select('*').eq('inventory_id', inventoryId).order('category_id', { ascending: true });
      if (fetchError) throw fetchError;
      const { error: deleteError } = await supabase.from('final_inventory_entries').delete().eq('inventory_id', inventoryId);
      if (deleteError) throw deleteError;
      if (!preliminaryEntries || preliminaryEntries.length === 0) return true;
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
      const { error: insertError } = await supabase.from('final_inventory_entries').insert(finalEntries);
      if (insertError) throw insertError;
      return true;
    } catch (error) {
      console.error('Błąd:', error);
      return false;
    }
  },

  async createFinalEntry(entry: Omit<FinalInventoryEntry, 'id' | 'net_value' | 'created_at' | 'updated_at'>): Promise<FinalInventoryEntry | null> {
    try {
      const { data, error } = await supabase.from('final_inventory_entries').insert([entry]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd:', error);
      return null;
    }
  },

  async updateFinalEntry(id: string, updates: Partial<FinalInventoryEntry>): Promise<FinalInventoryEntry | null> {
    try {
      const { data, error } = await supabase.from('final_inventory_entries').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd:', error);
      return null;
    }
  },

  async deleteFinalEntry(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('final_inventory_entries').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd:', error);
      return false;
    }
  }
};