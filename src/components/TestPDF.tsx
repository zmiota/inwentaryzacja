import React from 'react';
import { jsPDF } from 'jspdf';

export default function TestPDF() {
  const generateTestPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Test basic text
      doc.setFontSize(16);
      doc.text('Test PDF Generation', 20, 20);
      
      doc.setFontSize(12);
      doc.text('To jest test generowania PDF bez tabel', 20, 40);
      doc.text('Jeśli widzisz ten tekst, jsPDF działa poprawnie', 20, 60);
      
      doc.setFontSize(10);
      doc.text('Data: ' + new Date().toLocaleDateString('pl-PL'), 20, 80);
      
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
      <p className="mb-4 text-gray-600">
        Ten test sprawdza podstawowe generowanie PDF bez użycia tabel.
      </p>
      <button
        onClick={generateTestPDF}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Wygeneruj prosty PDF
      </button>
    </div>
  );
}