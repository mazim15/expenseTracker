import { ExpenseType } from "@/types/expense";
import { format } from "date-fns";

/**
 * Converts expense data to CSV format and triggers a download
 * @param expenses Array of expense objects to export
 * @param filename Optional custom filename for the CSV file
 */
export function exportExpensesToCSV(expenses: ExpenseType[], filename?: string): void {
  // Define CSV headers
  const headers = ["Date", "Amount", "Category", "Description"];
  
  // Convert expenses to CSV rows
  const rows = expenses.map(expense => [
    format(expense.date, "yyyy-MM-dd"),
    expense.amount.toString(),
    expense.category,
    `"${expense.description.replace(/"/g, '""')}"`  // Escape quotes in description
  ]);
  
  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");
  
  // Create a Blob with the CSV data
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  
  // Create a download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  // Set link properties
  link.setAttribute("href", url);
  link.setAttribute("download", filename || `expense-data-${format(new Date(), "yyyy-MM-dd")}.csv`);
  link.style.visibility = "hidden";
  
  // Add to document, trigger download, and clean up
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
} 