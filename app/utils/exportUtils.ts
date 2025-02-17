"use client";


export const exportToCSV = (expenses: any[]) => {
    const headers = ['Date', 'Amount', 'Description', 'Category'];
    const csvContent = [
      headers.join(','),
      ...expenses.map(expense => [
        expense.date.toDate().toLocaleDateString(),
        expense.amount,
        `"${expense.description.replace(/"/g, '""')}"`,
        expense.category
      ].join(','))
    ].join('\n');
  
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  export const exportToPDF = async (expenses: any[]) => {
    // Note: You'll need to install jspdf: npm install jspdf
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
  
    doc.setFontSize(16);
    doc.text('Expense Report', 20, 20);
  
    doc.setFontSize(12);
    let y = 40;
    expenses.forEach((expense, index) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${expense.date.toDate().toLocaleDateString()} - PKR ${expense.amount}`, 20, y);
      doc.text(`${expense.category}: ${expense.description}`, 20, y + 7);
      y += 20;
    });
  
    doc.save(`expenses_${new Date().toISOString().split('T')[0]}.pdf`);
  };