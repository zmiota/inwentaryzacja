import { FinalInventoryEntry, Inventory, CommissionMember } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF with autoTable
autoTable(jsPDF);

export const exportService = {
  async exportToPDF(inventory: Inventory, entries: FinalInventoryEntry[], commission: CommissionMember[]): Promise<void> {
    try {
      const doc = new jsPDF();
      
      // Ustawienia dokumentu
      doc.setFont('helvetica');
      
      // Nagłówek dokumentu
      doc.setFontSize(16);
      doc.text('PROTOKÓŁ INWENTARYZACJI', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Inwentaryzacja: ${inventory.name}`, 20, 35);
      
      if (inventory.unit_name) {
        doc.text(`Jednostka: ${inventory.unit_name}`, 20, 45);
      }
      
      if (inventory.unit_address) {
        doc.text(`Adres: ${inventory.unit_address}`, 20, 55);
      }
      
      doc.text(`Data utworzenia: ${new Date(inventory.created_at).toLocaleDateString('pl-PL')}`, 20, 65);
      doc.text(`Sposób inwentaryzacji: ${inventory.inventory_method || 'ciągły'}`, 20, 75);
      
      // Tabela z danymi
      const tableData = entries.map((entry, index) => [
        (index + 1).toString(),
        entry.pku_w || '',
        entry.product_name,
        entry.unit,
        entry.quantity.toLocaleString('pl-PL'),
        `${entry.net_price.toFixed(2)} zł`,
        `${entry.net_value.toFixed(2)} zł`
      ]);
      
      // Dodaj wiersz z sumą
      const totalValue = entries.reduce((sum, entry) => sum + entry.net_value, 0);
      tableData.push([
        '', '', '', '', '', 'SUMA:', `${totalValue.toFixed(2)} zł`
      ]);
      
      doc.autoTable({
        head: [['Lp', 'PKU i W', 'Nazwa produktu', 'J.m.', 'Ilość', 'Cena netto', 'Wartość netto']],
        body: tableData,
        startY: 85,
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
          0: { halign: 'center', cellWidth: 15 },
          1: { cellWidth: 20 },
          2: { cellWidth: 60 },
          3: { halign: 'center', cellWidth: 15 },
          4: { halign: 'right', cellWidth: 20 },
          5: { halign: 'right', cellWidth: 25 },
          6: { halign: 'right', cellWidth: 25 }
        },
        didParseCell: function(data: any) {
          // Pogrub ostatni wiersz (suma)
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      });
      
      // Podpisy komisji (jeśli są)
      if (commission && commission.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        
        doc.setFontSize(12);
        doc.text('Komisja inwentaryzacyjna:', 20, finalY);
        
        commission.forEach((member, index) => {
          const yPos = finalY + 15 + (index * 10);
          doc.setFontSize(10);
          doc.text(`${member.name} - ${member.role === 'chairman' ? 'Przewodniczący' : 'Członek'}`, 20, yPos);
          doc.text('................................', 120, yPos);
        });
      }
      
      // Stopka
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.text(`Wygenerowano: ${new Date().toLocaleString('pl-PL')}`, 20, pageHeight - 10);
      
      // Zapisz plik
      const fileName = `inwentaryzacja_${inventory.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Błąd podczas eksportu do PDF:', error);
      alert('Wystąpił błąd podczas generowania PDF');
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