import jsPDF from 'jspdf';

export const testPDF = () => {
  const doc = new jsPDF();
  doc.text('Test ESGFlow', 10, 10);
  doc.save('test.pdf');
};
