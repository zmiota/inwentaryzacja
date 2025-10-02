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
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        compress: true
      });
      
      // --- Nagłówek (pierwsza linia na środku) ---
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const title = `Inwentaryzacja koncowa - ${inventory.name}`;
      doc.text(
        title,
        doc.internal.pageSize.getWidth() / 2,
        15,
        { align: 'center' }
      );

      // --- Dwa pola tekstowe pod nagłówkiem ---
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Lewa strona
      const commissionText = `Sklad komisji inwentaryzacyjnej \n.....................................\n.....................................\n..................................... : ${commission.map(c => c.name).join(', ')}`;
      doc.text(commissionText, 14, 25);

      const datastart = `Spis rozpoczeto dn ................... o godz ...................`;
      doc.text(datastart, 14, 30);

      // Prawa strona
      const rinwente = `Rodzaj inwentaryzacji - .....................................\nSposob przeprowadzenia - .....................................`;
const lines = doc.splitTextToSize(rinwente, 180);
doc.text(
  lines,
  doc.internal.pageSize.getWidth() - 14,
  25,
  { align: 'right' }
);
      const datakoniec = `Spis zakonczono dn ................... o godz ...................`;
      const lines2 = doc.splitTextToSize(datakoniec, 180);
doc.text(
  lines2,
  doc.internal.pageSize.getWidth() - 14,
  30,
  { align: 'right' }
  );

      // --- Tabela z danymi ---
      const tableData = entries.map((entry, index) => [
        (index + 1).toString(), // Lp
        entry.pku_w || '-',
        this.encodePolishText(entry.product_name || ''),
        entry.unit,
        entry.quantity.toString(),
        `${entry.net_price.toFixed(2)} zl`,
        `${entry.net_value.toFixed(2)} zl`,
      ]);

      // Dodaj wiersz z sumą
      const totalValue = entries.reduce((sum, entry) => sum + entry.net_value, 0);
      tableData.push(['', '', '', '', '', 'SUMA NETTO:', `${totalValue.toFixed(2)} zl`]);

      autoTable(doc, {
        head: [['Lp', 'PKU i W', 'Nazwa produktu', 'J.m.', 'Ilosc', 'Cena netto', 'Wartosc netto']],
        body: tableData,
        startY: 35,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          font: 'helvetica'
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold',
          font: 'helvetica'
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
          }
        },
      });

      // --- Pola pod tabelą ---
      const finalY = (doc as any).lastAutoTable.finalY || 40; // pozycja końca tabeli
      const margin = 14;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Pole po lewej
      doc.text('Podpis osoby material: \n Wycenil(imie nazwisko)..................................(podpis)..................................\nPodpis osoby material: \n Wycenil(imie nazwisko)..................................(podpis)..................................(', margin, finalY + 20);

      // Pole po prawej
      doc.text(
        'Sklad komisji inwentaryzacyjnej \n Przewodniczacy.....................................\nCzlonkowie: Izabela Pawlowska (imie i nazwisko)\n Podpis.....................................\Czlonkowie: Pawel Pawlowski (imie i nazwisko)\n Podpis.....................................',
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

  encodePolishText(text: string): string {
    if (!text) return '';

    const polishChars: { [key: string]: string } = {
      'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
      'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
    };

    return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (match) => polishChars[match] || match);
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
    const headers = ['Lp', 'PKU i W', 'Nazwa produktu', 'J.m.', 'Ilosc', 'Cena netto', 'Wartosc netto'];
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
    csvRows.push(`"SUMA WARTOSCI NETTO:",${totalValue.toFixed(2)}`);

    return csvRows.join('\n');
  }
};
