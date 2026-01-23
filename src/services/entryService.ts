import { supabase } from '../lib/supabase';
import { InventoryEntry, FinalInventoryEntry } from '../types';

export const entryService = {
  // 1. Pobieranie wpisów z paginacją (limit 250)
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

  // 2. Statystyki kategorii (Liczenie > 1000 rekordów metodą batchingu)
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

  // 3. Tworzenie wpisu wstępnego
  async createPreliminaryEntry(entry: Omit<InventoryEntry, 'id' | 'net_value' | 'created_at' | 'updated_at'>): Promise<InventoryEntry | null> {
    const { data, error } = await supabase
      .from('inventory_entries')
      .insert([entry])
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  // 4. Aktualizacja wpisu wstępnego
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

  // 5. Usuwanie wpisu wstępnego
  async deletePreliminaryEntry(id: string): Promise<boolean> {
    const { error } = await supabase.from('inventory_entries').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // 6. Inwentaryzacja końcowa - Pobieranie Z PAGINACJĄ
  async getFinalEntries(
    inventoryId: string,
    limit: number = 250,
    offset: number = 0
  ): Promise<FinalInventoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('final_inventory_entries')
        .select('*')
        .eq('inventory_id', inventoryId)
        .order('sequence_number', { ascending: true })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd getFinalEntries:', error);
      return [];
    }
  },

  // 6a. Statystyki inwentaryzacji końcowej (całość dla stopki)
  async getFinalInventoryStats(inventoryId: string): Promise<{ count: number, totalValue: number }> {
    try {
      const { count, error: countError } = await supabase
        .from('final_inventory_entries')
        .select('*', { count: 'exact', head: true })
        .eq('inventory_id', inventoryId);

      if (countError) throw countError;

      let totalValue = 0;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('final_inventory_entries')
          .select('net_value')
          .eq('inventory_id', inventoryId)
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
      console.error('Błąd getFinalInventoryStats:', error);
      return { count: 0, totalValue: 0 };
    }
  },

  // 7. Generowanie raportu końcowego - TUTAJ TEŻ POPRAWIONO POBIERANIE (obsługa > 1000 pozycji wstępnych)
  async generateFinalFromPreliminary(inventoryId: string): Promise<boolean> {
    // Pobieramy wszystkie wpisy wstępne partiami
    let allPreliminaryEntries: any[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('inventory_entries')
        .select('*')
        .eq('inventory_id', inventoryId)
        .order('category_id', { ascending: true })
        .range(offset, offset + 999);

      if (error) throw error;
      if (data && data.length > 0) {
        allPreliminaryEntries = [...allPreliminaryEntries, ...data];
        if (data.length === 1000) offset += 1000;
        else hasMore = false;
      } else {
        hasMore = false;
      }
    }

    // Czyścimy starą inwentaryzację końcową
    await supabase.from('final_inventory_entries').delete().eq('inventory_id', inventoryId);

    if (allPreliminaryEntries.length === 0) return true;

    const finalEntries = allPreliminaryEntries.map((entry, index) => ({
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

    // Wstawiamy partiami (Supabase ma limity wielkości inserta)
    for (let i = 0; i < finalEntries.length; i += 500) {
      const chunk = finalEntries.slice(i, i + 500);
      const { error: insertError } = await supabase.from('final_inventory_entries').insert(chunk);
      if (insertError) throw insertError;
    }

    return true;
  },

  // 8. Operacje na wpisach końcowych
  async createFinalEntry(entry: Omit<FinalInventoryEntry, 'id' | 'net_value' | 'created_at' | 'updated_at'>): Promise<FinalInventoryEntry | null> {
    const { data, error } = await supabase.from('final_inventory_entries').insert([entry]).select().single();
    if (error) throw error;
    return data;
  },

  async updateFinalEntry(id: string, updates: Partial<FinalInventoryEntry>): Promise<FinalInventoryEntry | null> {
    const { data, error } = await supabase
      .from('final_inventory_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteFinalEntry(id: string): Promise<boolean> {
    const { error } = await supabase.from('final_inventory_entries').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};