// backend/src/models/Budget.ts
export interface Budget {
  id: number;
  categoryId: number;
  month: string; // YYYY-MM format
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetInput {
  categoryId: number;
  month: string;
  amount: number;
}
