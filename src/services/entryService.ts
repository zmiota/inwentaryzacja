import { supabase } from '../lib/supabase';
import { InventoryEntry, FinalInventoryEntry } from '../types';

export const entryService = {
  // Pobieranie wpisów z paginacją
  async getPreliminaryEntries(
    inventoryId: string, 
    categoryId?: string, 
    limit: number = 250, 
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

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd getPreliminaryEntries:', error);
      return [];
    }
  },

  // Statystyki kategorii (Liczenie > 1000 rekordów)
  async getCategoryStats(inventoryId: string, categoryId: string): Promise<{ count: number, totalValue: number }> {
    try {
      const { count, error: countError } = await supabase
        .from('inventory_entries')
        .select('*', { count: 'exact', head: true })
        .eq('inventory_id', inventoryId)
        .eq('category_id', categoryId);

      if (countError) throw countError;

      let totalValue = 0;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('inventory_entries')
          .select('net_value')
          .eq('inventory_id', inventoryId)
          .eq('category_id', categoryId)
          .range(offset, offset + 999);

        if (error) throw error;

        if (data && data.length > 0) {
          totalValue += data.reduce((sum, item) => sum + (item.net_value || 0), 0);
          if (data.length === 1000) offset += 1000;
          else hasMore = false;
        } else {
          hasMore = false;
        }
      }

      return { count: count || 0, totalValue };
    } catch (error) {
      console.error('Błąd getCategoryStats:', error);
      return { count: 0, totalValue: 0 };
    }
  },

  async createPreliminaryEntry(entry: Omit<InventoryEntry, 'id' | 'net_value' | 'created_at' | 'updated_at'>): Promise<InventoryEntry | null> {
    const { data, error } = await supabase
      .from('inventory_entries')
      .insert([entry])
      .select('*')
      .single();
    
    if (error) throw error; // Wyrzucamy błąd do handleSubmitEntry
    return data;
  },

  async updatePreliminaryEntry(id: string, updates: Partial<InventoryEntry>): Promise<InventoryEntry | null> {
    const { data, error } = await supabase
      .from('inventory_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  async deletePreliminaryEntry(id: string): Promise<boolean> {
    const { error } = await supabase.from('inventory_entries').delete().eq('id', id);
    if (error) throw error;
    return true;
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
// Wewnątrz obiektu entryService w pliku entryService.ts

  async getCategoryStats(inventoryId: string, categoryId: string): Promise<{ count: number, totalValue: number }> {
  try {
    // 1. Pobieramy całkowitą liczbę rekordów (Supabase potrafi to zrobić jednym zapytaniem bez pobierania danych)
    const { count, error: countError } = await supabase
      .from('inventory_entries')
      .select('*', { count: 'exact', head: true })
      .eq('inventory_id', inventoryId)
      .eq('category_id', categoryId);

    if (countError) throw countError;

    // 2. Sumowanie wartości netto (Musimy pobierać dane w pętli po 1000 rekordów, bo API nie wyśle więcej na raz)
    let totalValue = 0;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('inventory_entries')
        .select('net_value')
        .eq('inventory_id', inventoryId)
        .eq('category_id', categoryId)
        .range(offset, offset + 999); // Pobieraj zakresy: 0-999, 1000-1999, itd.

      if (error) throw error;

      if (data && data.length > 0) {
        // Dodaj wartości z aktualnej paczki (1000 sztuk) do sumy
        totalValue += data.reduce((sum, item) => sum + (item.net_value || 0), 0);
        
        // Jeśli pobraliśmy dokładnie 1000, spróbuj pobrać kolejną paczkę
        if (data.length === 1000) {
          offset += 1000;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return { 
      count: count || 0, 
      totalValue 
    };
  } catch (error) {
    console.error('Błąd podczas obliczania statystyk:', error);
    return { count: 0, totalValue: 0 };
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