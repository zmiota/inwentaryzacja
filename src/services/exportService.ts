import { FinalInventoryEntry, Inventory, CommissionMember } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportService = {
  async exportToPDF(
    inventory: Inventory,
    entries: FinalInventoryEntry[],
    commission: CommissionMember[]
  ): Promise<void> {
    try {
      const doc = new jsPDF();
      
      // Włącz obsługę unicode i ustaw font obsługujący polskie znaki
      doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto');
      
      // Alternatywnie, możesz użyć wbudowanego fontu z obsługą unicode:
      // doc.setFont('helvetica');
      
      // --- Nagłówek (pierwsza linia na środku) ---
      doc.setFontSize(14);
      doc.setFont('Roboto', 'bold');
      const title = `Inwentaryzacja końcowa - ${inventory.name}`;
      doc.text(
        title,
        doc.internal.pageSize.getWidth() / 2,
        15,
        { align: 'center' }
      );

      // --- Dwa pola tekstowe pod nagłówkiem ---
      doc.setFontSize(10);
      doc.setFont('Roboto', 'normal');

      // Lewa strona
      const dateText = `Data: ${new Date().toLocaleDateString('pl-PL')}`;
      doc.text(dateText, 14, 25);

      // Prawa strona
      const commissionText = `Komisja: ${commission.map(c => c.name).join(', ')}`;
      doc.text(
        commissionText,
        doc.internal.pageSize.getWidth() - 14,
        25,
        { align: 'right' }
      );

      // --- Tabela z danymi ---
      const tableData = entries.map((entry, index) => [
        (index + 1).toString(), // Lp
        entry.pku_w || '',
        entry.product_name,
        entry.unit,
        entry.quantity.toString(),
        `${entry.net_price.toFixed(2)} zł`,
        `${entry.net_value.toFixed(2)} zł`,
      ]);

      // Dodaj wiersz z sumą
      const totalValue = entries.reduce((sum, entry) => sum + entry.net_value, 0);
      tableData.push(['', '', '', '', '', 'SUMA:', `${totalValue.toFixed(2)} zł`]);

      autoTable(doc, {
        head: [['Lp', 'PKU i W', 'Nazwa produktu', 'J.m.', 'Ilość', 'Cena netto', 'Wartość netto']],
        body: tableData,
        startY: 35,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          font: 'Roboto', // Ustaw font dla całej tabeli
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold',
          font: 'Roboto',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },  // Lp
          1: { cellWidth: 15 },                   // PKU i W
          2: { cellWidth: 60 },                   // Nazwa produktu
          3: { halign: 'center', cellWidth: 10 }, // J.m.
          4: { halign: 'center', cellWidth: 10 }, // Ilość
          5: { halign: 'right', cellWidth: 40 },  // Cena netto
          6: { halign: 'right', cellWidth: 40 },  // Wartość netto
        },
        didParseCell: function (data) {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [220, 220, 220];
            data.cell.styles.font = 'Roboto';
          }
        },
      });
      
      // --- Pola pod tabelą ---
      const finalY = (doc as any).lastAutoTable.finalY || 40; // pozycja końca tabeli
      const margin = 14;

      doc.setFontSize(10);
      doc.setFont('Roboto', 'normal');

      // Pole po lewej
      doc.text('Podpis przewodniczącego komisji', margin, finalY + 20);

      // Pole po prawej
      doc.text(
        'Podpis członka komisji',
        doc.internal.pageSize.getWidth() - margin,
        finalY + 20,
        { align: 'right' }
      );

      // --- Zapisz plik ---
      const fileName = `inwentaryzacja_koncowa_${inventory.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Błąd podczas eksportu do PDF:', error);
      throw error;
    }
  },

  async exportToExcel(inventory: Inventory, entries: FinalInventoryEntry[]): Promise<void> {
    try {
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
