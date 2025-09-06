import { FinalInventoryEntry, Inventory, CommissionMember } from '../types';

export const exportService = {
  async exportToPDF(inventory: Inventory, entries: FinalInventoryEntry[], commission: CommissionMember[]): Promise<void> {
    try {
      // W rzeczywistej implementacji używałby biblioteki jak jsPDF
      console.log('Eksport do PDF:', { inventory, entries, commission });
      alert('Funkcja eksportu do PDF będzie dostępna wkrótce');
    } catch (error) {
      console.error('Błąd podczas eksportu do PDF:', error);
    }
  },

  async exportToExcel(inventory: Inventory, entries: FinalInventoryEntry[]): Promise<void> {
    try {
      // W rzeczywistej implementacji używałby biblioteki jak SheetJS
      const csvContent = this.generateCSV(entries);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `inwentaryzacja_${inventory.name}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Błąd podczas eksportu do Excel:', error);
    }
  },

  generateCSV(entries: FinalInventoryEntry[]): string {
    const headers = ['Lp', 'PKU i W', 'Nazwa produktu', 'J.m.', 'Ilość', 'Cena netto', 'Wartość netto'];
    const csvRows = [headers.join(',')];
    
    entries.forEach(entry => {
      const row = [
        entry.row_number,
        entry.pku_w || '',
        `"${entry.product_name}"`,
        entry.unit,
        entry.quantity,
        entry.net_price,
        entry.net_value
      ];
      csvRows.push(row.join(','));
    });

    const totalValue = entries.reduce((sum, entry) => sum + entry.net_value, 0);
    csvRows.push('');
    csvRows.push(`"SUMA WARTOŚCI NETTO:",${totalValue.toFixed(2)}`);

    return csvRows.join('\n');
  }
};