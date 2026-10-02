import { ExpenseType } from "@/types/expense";
import { format } from "date-fns";

/** Quotes a CSV field when needed and escapes embedded quotes. */
export function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function expensesToCSV(expenses: ExpenseType[]): string {
  const headers = [
    "Date",
    "Amount",
    "Category",
    "Description",
    "Tags",
    "Location",
    "Payment method",
  ];
  const rows = expenses.map((expense) => [
    format(expense.date, "yyyy-MM-dd"),
    expense.amount.toString(),
    expense.category,
    expense.description,
    (expense.tags ?? []).join(";"),
    expense.location ?? "",
    expense.paymentMethod ?? "",
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

/**
 * Converts expense data to CSV format and triggers a download
 * @param expenses Array of expense objects to export
 * @param filename Optional custom filename for the CSV file
 */
export function exportExpensesToCSV(expenses: ExpenseType[], filename?: string): void {
  // The BOM makes Excel read the file as UTF-8 (currency symbols, Urdu text)
  const csvContent = "\uFEFF" + expensesToCSV(expenses);

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
