import { OCRResult } from '../types';

export const ocrService = {
  async processDocument(file: File): Promise<OCRResult | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // W rzeczywistej implementacji to wywołałoby edge function z OpenAI API
      // Na razie mock response dla demonstracji
      await new Promise(resolve => setTimeout(resolve, 2000)); // Symulacja czasu przetwarzania

      // Mock rezultatu OCR - w rzeczywistości byłby to wynik z OpenAI
      return {
        product_name: 'Przykładowy produkt z dokumentu',
        quantity: 10,
        price: 29.99,
        invoice_number: 'FV/2025/001',
        confidence: 0.85
      };
    } catch (error) {
      console.error('Błąd podczas przetwarzania dokumentu OCR:', error);
      return null;
    }
  }
};