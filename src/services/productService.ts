import { supabase } from '../lib/supabase';
import { Product } from '../types';

export const productService = {
  async search(
    query: string,
    categoryId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Product[]> {
    try {
      // 1. Inicjalizacja zapytania z JOINem do kategorii
      let queryBuilder = supabase
        .from('products')
        .select('*, category:categories(*)')
        .order('name', { ascending: true });

      // 2. Filtrowanie kategorii (na poziomie bazy danych)
      if (categoryId) {
        queryBuilder = queryBuilder.eq('category_id', categoryId);
      }

      // 3. Zaawansowane wyszukiwanie słów kluczowych (na poziomie bazy danych)
      // Logika: Każde słowo musi wystąpić w nazwie LUB kodzie kreskowym (AND dla słów)
      if (query && query.trim()) {
        const keywords = query.trim().toLowerCase().split(/\s+/);
        
        keywords.forEach(keyword => {
          const pattern = `%${keyword}%`;
          // Używamy .or(), aby sprawdzić nazwę lub kod dla konkretnego słowa
          // Chaining wielu .or() w Supabase działa jak operator AND między nimi
          queryBuilder = queryBuilder.or(`name.ilike.${pattern},barcode.ilike.${pattern}`);
        });
      }

      // 4. Prawdziwa paginacja (Pobieramy tylko to, co wyświetlamy)
      // .range(0, 49) pobierze dokładnie 50 rekordów
      const { data, error } = await queryBuilder
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Błąd podczas wyszukiwania produktów:', error);
      return [];
    }
  },

  async getCount(query?: string, categoryId?: string): Promise<number> {
    try {
      // Head: true sprawia, że nie pobieramy danych, tylko samą liczbę rekordów
      let queryBuilder = supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (categoryId) {
        queryBuilder = queryBuilder.eq('category_id', categoryId);
      }

      if (query && query.trim()) {
        const keywords = query.trim().toLowerCase().split(/\s+/);
        keywords.forEach(keyword => {
          const pattern = `%${keyword}%`;
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

  // ... reszta metod (create, update, delete) pozostaje bez zmian, 
  // ponieważ one operują na pojedynczych rekordach ...
};