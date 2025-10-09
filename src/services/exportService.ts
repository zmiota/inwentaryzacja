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

      const margin = 14;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Funkcja do dodawania numeracji strony w prawym górnym rogu
      const addPageNumber = () => {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.setFont('Roboto', 'normal');
          doc.text(`str ${i}`, pageWidth - margin - 5, 10, { align: 'right' });
        }
      };

      // Funkcja rysująca nagłówek - będzie wywoływana na każdej stronie
      const drawHeader = () => {
        let currentY = 12;
        const headerMargin = 10;

        // Nagłówek
        doc.setFontSize(14);
        doc.setFont('Roboto', 'bold');
        const title = `Arkusz spisu z natury uniwersalny`;
        doc.text(title, pageWidth / 2, currentY, { align: 'center' });

        currentY += 8;

        // Linia oddzielająca
        doc.setLineWidth(0.5);
        doc.line(headerMargin, currentY, pageWidth - headerMargin, currentY);

        currentY += 6;

        // Informacje górne - dwie kolumny
        doc.setFontSize(8);
        doc.setFont('Roboto', 'normal');

        // Lewa kolumna
        const leftColumnX = headerMargin;
        doc.text('Skład komisji inwentaryzacyjnej:', leftColumnX, currentY);
        currentY += 4;
        doc.text('Przewodniczący: ........................................', leftColumnX, currentY);
        currentY += 3.5;
        doc.text('Członek 1: ........................................', leftColumnX, currentY);
        currentY += 3.5;
        doc.text('Członek 2: ........................................', leftColumnX, currentY);
        currentY += 5;

        doc.text('Spis rozpoczęto:', leftColumnX, currentY);
        currentY += 3.5;
        doc.text('Dnia: ............... o godz: ...............', leftColumnX, currentY);

        // Prawa kolumna - dane sklepu
        const rightColumnX = pageWidth / 2 + 5;
        let rightY = 26;

        doc.setFont('Roboto', 'bold');
        doc.text('Sklep wielobranżowy FARMER - PALEŚ', rightColumnX, rightY);
        rightY += 3.5;
        doc.setFont('Roboto', 'normal');
        doc.text('Paweł Pawłowski ul. Kilińskiego 11', rightColumnX, rightY);
        rightY += 3.5;
        doc.text('62-410 Zagórów', rightColumnX, rightY);
        rightY += 3.5;
        doc.text('NIP 6671252482', rightColumnX, rightY);
        rightY += 6;

        doc.text('Spis zakończono:', rightColumnX, rightY);
        rightY += 3.5;
        doc.text('Dnia: ............... o godz: ...............', rightColumnX, rightY);
        rightY += 6;

        doc.setFont('Roboto', 'bold');
        doc.text(`Rodzaj inwentaryzacji: końcowa - ${inventory.name}`, rightColumnX, rightY);
        doc.setFont('Roboto', 'normal');

        return Math.max(currentY, rightY) + 6;
      };

      // Rysuj nagłówek na pierwszej stronie
      const tableStartY = drawHeader();

      // --- Tabela z danymi ---
      const tableData = entries.map((entry, index) => [
        (index + 1).toString(), // Lp
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
        margin: { top: tableStartY, left: 10, right: 10, bottom: 15 },
        showHead: 'everyPage',
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          font: 'Roboto',
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'normal',
          font: 'Roboto',
          fontSize: 7
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { cellWidth: 18 },
          2: { cellWidth: 75 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'right', cellWidth: 14 },
          5: { halign: 'right', cellWidth: 22 },
          6: { halign: 'right', cellWidth: 24 },
        },
        didParseCell: function (data) {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [220, 220, 220];
          }
        },
        didDrawPage: function (data) {
          // Rysuj nagłówek dokumentu na każdej stronie
          if (data.pageNumber > 1) {
            drawHeader();
          }
        },
      });

      // Pobierz informacje o zakończeniu tabeli
      const finalY = (doc as any).lastAutoTable.finalY || tableStartY;
      const totalPages = doc.getNumberOfPages();

      // Sprawdź, czy na ostatniej stronie jest dość miejsca na podpisy
      // Jeśli nie, dodaj nową stronę z nagłówkiem
      const spaceNeeded = 60; // przestrzeń potrzebna na podpisy
      const spaceAvailable = pageHeight - finalY;

      let currentY: number;

      if (spaceAvailable < spaceNeeded) {
        // Za mało miejsca - dodaj nową stronę z nagłówkiem i podpisami
        doc.addPage();
        currentY = drawHeader() + 5;
      } else {
        // Jest miejsce - podpisy bezpośrednio pod tabelą
        currentY = finalY + 10;
      }

      // Linia oddzielająca
      doc.setLineWidth(0.5);
      doc.line(10, currentY, pageWidth - 10, currentY);

      currentY += 8;

      doc.setFontSize(8);
      doc.setFont('Roboto', 'normal');

      // Lewa sekcja - podpisy osoby odpowiedzialnej
      const leftColumnX = 10;
      const rightColumnX = pageWidth / 2 + 5;

      doc.setFont('Roboto', 'bold');
      doc.text('Osoby odpowiedzialne materialnie:', leftColumnX, currentY);
      doc.setFont('Roboto', 'normal');
      currentY += 5;

      doc.text('Wycenił:', leftColumnX, currentY);
      currentY += 3.5;
      doc.text('Imię i nazwisko: ..............................................', leftColumnX + 2, currentY);
      currentY += 4;
      doc.text('Podpis: ..............................................', leftColumnX + 2, currentY);

      // Prawa sekcja - podpisy komisji
      const signatureY = currentY - 8;
      doc.setFont('Roboto', 'bold');
      doc.text('Podpisy komisji inwentaryzacyjnej:', rightColumnX, signatureY);
      doc.setFont('Roboto', 'normal');

      let signY = signatureY + 5;

      if (commission.length > 0) {
        commission.forEach((member, index) => {
          if (index === 0) {
            doc.text(`Przewodniczący: ${member.name}`, rightColumnX, signY);
          } else {
            doc.text(`Członek: ${member.name}`, rightColumnX, signY);
          }
          signY += 3.5;
          doc.text('Podpis: ................................', rightColumnX + 2, signY);
          signY += 5;
        });
      } else {
        doc.text('Przewodniczący: ................................', rightColumnX, signY);
        signY += 3.5;
        doc.text('Podpis: ................................', rightColumnX + 2, signY);
        signY += 5;
        doc.text('Członek: ................................', rightColumnX, signY);
        signY += 3.5;
        doc.text('Podpis: ................................', rightColumnX + 2, signY);
      }

      // Dodaj numerację stron
      addPageNumber();

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
