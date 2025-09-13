import { FinalInventoryEntry, Inventory, CommissionMember } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportService = {
  async exportToPDF(inventory: Inventory, entries: FinalInventoryEntry[], commission: CommissionMember[]): Promise<void> {
    try {
      const doc = new jsPDF();
      
      // Tabela z danymi
      const tableData = entries.map((entry, index) => [
        (index + 1).toString(), // Lp
        entry.pku_w || '',
        entry.product_name,
        entry.unit,
        entry.quantity.toString(),
        `${entry.net_price.toFixed(2)} zł`,
        `${entry.net_value.toFixed(2)} zł`
      ]);
      
      // Dodaj wiersz z sumą
      const totalValue = entries.reduce((sum, entry) => sum + entry.net_value, 0);
      tableData.push([
        '', '', '', '', '', 'SUMA:', `${totalValue.toFixed(2)} zł`
      ]);
      
      autoTable(doc, {
        head: [['Lp', 'PKU i W', 'Nazwa produktu', 'J.m.', 'Ilość', 'Cena netto', 'Wartość netto']],
        body: tableData,
        startY: 20,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 }, // Lp
          1: { cellWidth: 20 }, // PKU i W
          2: { cellWidth: 60 }, // Nazwa produktu
          3: { halign: 'center', cellWidth: 15 }, // J.m.
          4: { halign: 'right', cellWidth: 20 }, // Ilość
          5: { halign: 'right', cellWidth: 25 }, // Cena netto
          6: { halign: 'right', cellWidth: 30 } // Wartość netto
        },
        didParseCell: function(data) {
          // Pogrub ostatni wiersz (suma)
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [220, 220, 220];
          }
        }
      });
      
      // Zapisz plik
      const fileName = `inwentaryzacja_koncowa_${inventory.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Błąd podczas eksportu do PDF:', error);
      throw error;
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