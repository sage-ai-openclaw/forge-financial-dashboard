export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  createdAt: string;
}

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  categoryId: number | null;
  type: 'income' | 'expense';
  createdAt: string;
  updatedAt: string;
}

export interface TransactionWithCategory extends Transaction {
  categoryName?: string;
  categoryColor?: string;
}

export interface Budget {
  id: number;
  categoryId: number;
  amount: number;
  month: string;
  year: number;
  createdAt: string;
}

export interface BudgetWithSpending extends Budget {
  categoryName: string;
  categoryColor: string;
  spent: number;
  remaining: number;
  percentageUsed: number;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  categoryCount: number;
  overBudgetCount: number;
}

export interface CreateTransactionInput {
  amount: number;
  description: string;
  date: string;
  categoryId?: number;
  type: 'income' | 'expense';
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  type?: 'income' | 'expense';
}

export interface MonthlySummary {
  month: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}
