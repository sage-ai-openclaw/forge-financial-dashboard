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

export interface CreateTransactionInput {
  amount: number;
  description: string;
  date: string;
  categoryId?: number;
  type: 'income' | 'expense';
}

export interface UpdateTransactionInput {
  amount?: number;
  description?: string;
  date?: string;
  categoryId?: number | null;
  type?: 'income' | 'expense';
}

export interface CreateCategoryInput {
  name: string;
  type: 'income' | 'expense';
  color?: string;
}

export interface CreateBudgetInput {
  categoryId: number;
  amount: number;
  month: string;
  year: number;
}

export interface MonthlySummary {
  month: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  categoryBreakdown: {
    categoryId: number;
    categoryName: string;
    categoryColor: string;
    amount: number;
    percentage: number;
  }[];
}
