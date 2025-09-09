import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function TestPDF() {
  const generateTestPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Test basic text
      doc.setFontSize(16);
      doc.text('Test PDF Generation', 20, 20);
      
      // Test autoTable
      const tableData = [
        ['Product 1', '10', '5.00', '50.00'],
        ['Product 2', '5', '10.00', '50.00'],
        ['Product 3', '2', '25.00', '50.00']
      ];
      
      doc.autoTable({
        head: [['Product', 'Quantity', 'Price', 'Total']],
        body: tableData,
        startY: 40,
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold'
        }
      });
      
      doc.save('test.pdf');
      alert('PDF wygenerowany pomyślnie!');
    } catch (error) {
      console.error('Błąd podczas generowania PDF:', error);
      alert(`Błąd: ${error}`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test generowania PDF</h1>
      <button
        onClick={generateTestPDF}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Wygeneruj testowy PDF
      </button>
    </div>
  );
}