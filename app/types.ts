export interface ExpenseListProps {
  user: User;
  setExpenseToEdit: (expense: Expense) => void;
  categories?: string[]; // Make it optional
} 