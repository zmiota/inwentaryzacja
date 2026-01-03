import { supabase } from '../lib/supabase';
import { Product } from '../types';

export const productService = {
  async search(
    query: string = '',
    categoryId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Product[]> {
    try {
      let queryBuilder = supabase
        .from('products')
        .select('*, category:categories(*)')
        .order('name', { ascending: true });

      if (categoryId && categoryId.trim() !== '') {
        queryBuilder = queryBuilder.eq('category_id', categoryId);
      }

      // Filtrowanie po stronie serwera (Szybkie)
      if (query && query.trim().length >= 2) {
        const keywords = query.trim().toLowerCase().split(/\s+/);
        keywords.forEach(keyword => {
          const pattern = `%${keyword}%`;
          queryBuilder = queryBuilder.or(`name.ilike.${pattern},barcode.ilike.${pattern}`);
        });
      }

      // Prawdziwa paginacja - omija limit 1000
      const { data, error } = await queryBuilder
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd podczas wyszukiwania:', error);
      return [];
    }
  },

async getCount(query?: string, categoryId?: string): Promise<number> {
  try {
    // 1. Używamy count: 'exact' i head: true (nie pobieramy wierszy, tylko samą liczbę)
    let queryBuilder = supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // 2. Filtrowanie kategorii po stronie bazy
    if (categoryId) {
      queryBuilder = queryBuilder.eq('category_id', categoryId);
    }

    // 3. Filtrowanie wyszukiwania po stronie bazy
    if (query && query.trim()) {
      const keywords = query.trim().toLowerCase().split(/\s+/);
      
      // Tworzymy zapytanie, które sprawdza czy nazwa lub kod zawiera słowa kluczowe
      // Przykład dla wielu słów: .ilike('name', '%słowo1%').ilike('name', '%słowo2%')
      keywords.forEach(keyword => {
        const pattern = `%${keyword}%`;
        // Używamy or, aby przeszukać nazwę LUB kod kreskowy dla każdego słowa
        queryBuilder = queryBuilder.or(`name.ilike.${pattern},barcode.ilike.${pattern}`);
      });
    }

    const { count, error } = await queryBuilder;

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Błąd podczas pobierania liczby produktów:', error);
    return 0;
  }
},

  async getByBarcode(barcode: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('barcode', barcode)
        .maybeSingle(); // Bezpieczniejsze niż .limit(1)
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas pobierania produktu po kodzie kreskowym:', error);
      return null;
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
        if (error.code === '23505' && error.message.includes('products_barcode_unique_idx')) {
          throw new Error('DUPLICATE_BARCODE');
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Błąd podczas tworzenia produktu:', error);
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
        if (error.code === '23505' && error.message.includes('products_barcode_unique_idx')) {
          throw new Error('DUPLICATE_BARCODE');
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Błąd podczas aktualizacji produktu:', error);
      throw error;
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
  },

  async removeBarcodeFromOtherProducts(barcode: string, currentProductId?: string): Promise<boolean> {
    try {
      if (!barcode) return true;

      let query = supabase
        .from('products')
        .update({ barcode: null })
        .eq('barcode', barcode);

      if (currentProductId) {
        query = query.neq('id', currentProductId);
      }

      const { error } = await query;

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Błąd podczas usuwania kodu kreskowego z innych produktów:', error);
      return false;
    }
  },

  async createOrUpdate(productData: {
    name: string;
    barcode?: string;
    unit: string;
    net_price: number;
    category_id: string;
    pku_w?: string;
    invoice_number?: string;
    notes?: string;
  }): Promise<Product | null> {
    try {
      const storedUser = localStorage.getItem('app_user');
      if (!storedUser) throw new Error('Użytkownik nie jest zalogowany');

      const appUser = JSON.parse(storedUser);

      if (productData.barcode) {
        const existingProduct = await this.getByBarcode(productData.barcode);

        if (existingProduct) {
          const updated = await this.update(existingProduct.id, {
            name: productData.name,
            unit: productData.unit,
            net_price: productData.net_price,
            category_id: productData.category_id,
            pku_w: productData.pku_w,
            invoice_number: productData.invoice_number,
            notes: productData.notes
          });
          return updated;
        } else {
          await this.removeBarcodeFromOtherProducts(productData.barcode);
        }
      }

      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...productData,
          user_id: appUser.id
        }])
        .select('*, category:categories(*)')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Błąd podczas tworzenia/aktualizacji produktu:', error);
      return null;
    }
  },

  async getCount(query?: string, categoryId?: string): Promise<number> {
    try {
      let queryBuilder = supabase
        .from('products')
        .select('*');

      if (categoryId) {
        queryBuilder = queryBuilder.eq('category_id', categoryId);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      let filteredData = data || [];

      // Filtruj dane po stronie klienta, aby obsługiwać wiele słów kluczowych
      if (query && query.trim()) {
        const keywords = query.trim().toLowerCase().split(/\s+/);
        filteredData = filteredData.filter(product => {
          const productName = product.name.toLowerCase();
          const productBarcode = (product.barcode || '').toLowerCase();

          // Sprawdź, czy wszystkie słowa kluczowe występują w nazwie lub kodzie kreskowym
          return keywords.every(keyword =>
            productName.includes(keyword) || productBarcode.includes(keyword)
          );
        });
      }

      return filteredData.length;
    } catch (error) {
      console.error('Błąd podczas pobierania liczby produktów:', error);
      return 0;
    }
  }
};