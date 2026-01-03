import { supabase } from '../lib/supabase';
import { Product } from '../types';

export const productService = {
  /**
   * Wyszukuje produkty z paginacją i filtrowaniem po stronie serwera.
   * Obsługuje wiele słów kluczowych (każde słowo musi wystąpić w nazwie lub kodzie).
   */
  async search(
    query: string = '',
    categoryId?: string,
    limit: number = 250,
    offset: number = 0
  ): Promise<Product[]> {
    try {
      let queryBuilder = supabase
        .from('products')
        .select('*, category:categories(*)')
        .order('name', { ascending: true });

      // 1. Filtrowanie kategorii
      if (categoryId && categoryId.trim() !== '') {
        queryBuilder = queryBuilder.eq('category_id', categoryId);
      }

      // 2. Filtrowanie wielu słów kluczowych (Logika AND między słowami)
      if (query && query.trim().length >= 2) {
        const keywords = query.trim().toLowerCase().split(/\s+/);
        keywords.forEach(keyword => {
          if (keyword.length > 0) {
            const pattern = `%${keyword}%`;
            // Każde słowo musi pasować do nazwy LUB kodu kreskowego
            queryBuilder = queryBuilder.or(`name.ilike.${pattern},barcode.ilike.${pattern}`);
          }
        });
      }

      // 3. Paginacja (Pobiera tylko zakres, np. 0-49, 50-99)
      const { data, error } = await queryBuilder
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd podczas wyszukiwania:', error);
      return [];
    }
  },

  /**
   * Pobiera łączną liczbę produktów spełniających kryteria.
   * Omija limit 1000 rekordów dzięki użyciu head: true.
   */
  async getCount(query?: string, categoryId?: string): Promise<number> {
    try {
      let queryBuilder = supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (categoryId && categoryId.trim() !== '') {
        queryBuilder = queryBuilder.eq('category_id', categoryId);
      }

      if (query && query.trim().length >= 2) {
        const keywords = query.trim().toLowerCase().split(/\s+/);
        keywords.forEach(keyword => {
          if (keyword.length > 0) {
            const pattern = `%${keyword}%`;
            queryBuilder = queryBuilder.or(`name.ilike.${pattern},barcode.ilike.${pattern}`);
          }
        });
      }

      const { count, error } = await queryBuilder;

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Błąd podczas pobierania licznika:', error);
      return 0;
    }
  },

  async getByBarcode(barcode: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('barcode', barcode)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd pobierania po kodzie:', error);
      return null;
    }
  },
async createOrUpdate(productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Product | null> {
    try {
      let existingProduct = null;

      // 1. Próbuj znaleźć po kodzie kreskowym (jeśli podany)
      if (productData.barcode) {
        existingProduct = await this.getByBarcode(productData.barcode);
      }

      if (existingProduct) {
        // 2. Jeśli istnieje - aktualizuj
        return await this.update(existingProduct.id, productData);
      } else {
        // 3. Jeśli nie istnieje - stwórz nowy
        return await this.create(productData);
      }
    } catch (error) {
      console.error('Błąd w createOrUpdate:', error);
      throw error;
    }
  },
  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> {
    try {
      const storedUser = localStorage.getItem('app_user');
      if (!storedUser) throw new Error('Użytkownik nie jest zalogowany');
      const appUser = JSON.parse(storedUser);

      const { data, error } = await supabase
        .from('products')
        .insert([{ ...product, user_id: appUser.id }])
        .select('*, category:categories(*)')
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('DUPLICATE_BARCODE');
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Błąd tworzenia:', error);
      throw error;
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

      if (error) {
        if (error.code === '23505') throw new Error('DUPLICATE_BARCODE');
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Błąd aktualizacji:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd usuwania:', error);
      return false;
    }
  }
};