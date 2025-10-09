import { FinalInventoryEntry, Inventory, CommissionMember } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPolishFont } from '../utils/robotoFont';

export const exportService = {
  async exportToPDF(
    inventory: Inventory,
    entries: FinalInventoryEntry[],
    commission: CommissionMember[]
  ): Promise<void> {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        compress: true
      });

      await addPolishFont(doc);

      let currentY = 15;
      const margin = 14;
      const pageWidth = doc.internal.pageSize.getWidth();

      // Nagłówek
      doc.setFontSize(16);
      doc.setFont('Roboto', 'bold');
      const title = `Inwentaryzacja końcowa - ${inventory.name}`;
      doc.text(title, pageWidth / 2, currentY, { align: 'center' });

      currentY += 10;

      // Linia oddzielająca
      doc.setDrawColor(66, 139, 202);
      doc.setLineWidth(0.5);
      doc.line(margin, currentY, pageWidth - margin, currentY);

      currentY += 8;

      // Informacje górne - dwie kolumny
      doc.setFontSize(9);
      doc.setFont('Roboto', 'normal');

      // Lewa kolumna
      const leftColumnX = margin;
      doc.text('Skład komisji inwentaryzacyjnej:', leftColumnX, currentY);
      currentY += 5;

      commission.forEach((member) => {
        doc.text(`• ${member.name} (${member.role === 'chairman' ? 'Przewodniczący' : 'Członek'})`, leftColumnX + 2, currentY);
        currentY += 4;
      });

      if (commission.length === 0) {
        doc.text('Przewodniczący: .................................................', leftColumnX + 2, currentY);
        currentY += 5;
        doc.text('Członek 1: .................................................', leftColumnX + 2, currentY);
        currentY += 5;
        doc.text('Członek 2: .................................................', leftColumnX + 2, currentY);
        currentY += 5;
      }

      // Prawa kolumna
      const rightColumnStart = 33;
      const rightColumnX = pageWidth / 2 + 5;

      doc.text('Rodzaj inwentaryzacji:', rightColumnX, rightColumnStart);
      doc.text(inventory.inventory_method || '...........................', rightColumnX + 2, rightColumnStart + 5);

      doc.text('Sposób przeprowadzenia:', rightColumnX, rightColumnStart + 10);
      doc.text(inventory.type === 'final' ? 'Końcowa' : 'Wstępna', rightColumnX + 2, rightColumnStart + 15);

      doc.text('Spis rozpoczęto:', rightColumnX, rightColumnStart + 20);
      doc.text('Dnia: ................. o godz: .................', rightColumnX + 2, rightColumnStart + 25);

      doc.text('Spis zakończono:', rightColumnX, rightColumnStart + 30);
      doc.text('Dnia: ................. o godz: .................', rightColumnX + 2, rightColumnStart + 35);

      // Ustaw startY dla tabeli
      const tableStartY = Math.max(currentY + 5, rightColumnStart + 43);

      // Tabela z danymi
      const tableData = entries.map((entry, index) => [
        (index + 1).toString(),
        entry.pku_w || '-',
        entry.product_name || '',
        entry.unit,
        entry.quantity.toString(),
        `${entry.net_price.toFixed(2)} zł`,
        `${entry.net_value.toFixed(2)} zł`,
      ]);

      // Dodaj wiersz z sumą
      const totalValue = entries.reduce((sum, entry) => sum + entry.net_value, 0);
      tableData.push(['', '', '', '', '', 'SUMA NETTO:', `${totalValue.toFixed(2)} zł`]);

      autoTable(doc, {
        head: [['Lp', 'PKU i W', 'Nazwa produktu', 'J.m.', 'Ilość', 'Cena netto', 'Wartość netto']],
        body: tableData,
        startY: tableStartY,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          font: 'Roboto',
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold',
          font: 'Roboto',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 20 },
          2: { cellWidth: 70 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'center', cellWidth: 15 },
          5: { halign: 'right', cellWidth: 30 },
          6: { halign: 'right', cellWidth: 30 },
        },
        didParseCell: function (data) {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.fontSize = 9;
          }
        },
        margin: { left: margin, right: margin }
      });

      // Pola pod tabelą
      const finalY = (doc as any).lastAutoTable.finalY || tableStartY + 20;

      currentY = finalY + 10;

      // Linia oddzielająca
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY, pageWidth - margin, currentY);

      currentY += 8;

      doc.setFontSize(9);
      doc.setFont('Roboto', 'normal');

      // Lewa sekcja - podpisy osoby odpowiedzialnej
      doc.setFont('Roboto', 'bold');
      doc.text('Osoby odpowiedzialne materialnie:', leftColumnX, currentY);
      doc.setFont('Roboto', 'normal');
      currentY += 6;

      doc.text('Wycenił:', leftColumnX, currentY);
      currentY += 4;
      doc.text('Imię i nazwisko: ....................................................', leftColumnX + 2, currentY);
      currentY += 5;
      doc.text('Podpis: ....................................................', leftColumnX + 2, currentY);
      currentY += 7;

      doc.text('Sprawdził:', leftColumnX, currentY);
      currentY += 4;
      doc.text('Imię i nazwisko: ....................................................', leftColumnX + 2, currentY);
      currentY += 5;
      doc.text('Podpis: ....................................................', leftColumnX + 2, currentY);

      // Prawa sekcja - podpisy komisji
      const signatureY = finalY + 16;
      doc.setFont('Roboto', 'bold');
      doc.text('Podpisy komisji inwentaryzacyjnej:', rightColumnX, signatureY);
      doc.setFont('Roboto', 'normal');

      let signY = signatureY + 6;

      if (commission.length > 0) {
        commission.forEach((member) => {
          doc.text(`${member.role === 'chairman' ? 'Przewodniczący:' : 'Członek:'}`, rightColumnX, signY);
          signY += 4;
          doc.text(`${member.name}`, rightColumnX + 2, signY);
          signY += 4;
          doc.text('Podpis: ........................................', rightColumnX + 2, signY);
          signY += 7;
        });
      } else {
        doc.text('Przewodniczący:', rightColumnX, signY);
        signY += 4;
        doc.text('Imię i nazwisko: ........................................', rightColumnX + 2, signY);
        signY += 4;
        doc.text('Podpis: ........................................', rightColumnX + 2, signY);
        signY += 7;

        doc.text('Członek:', rightColumnX, signY);
        signY += 4;
        doc.text('Imię i nazwisko: ........................................', rightColumnX + 2, signY);
        signY += 4;
        doc.text('Podpis: ........................................', rightColumnX + 2, signY);
      }

      // Stopka
      const footerY = doc.internal.pageSize.getHeight() - 10;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Wygenerowano: ${new Date().toLocaleString('pl-PL')}`,
        pageWidth / 2,
        footerY,
        { align: 'center' }
      );

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
      const csvContent = this.generateCSV(entries);
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `inwentaryzacja_${inventory.name}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Blad podczas eksportu do Excel:', error);
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
