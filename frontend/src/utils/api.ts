import type { Transaction, TransactionWithCategory, CreateTransactionInput, Category, TransactionFilters, MonthlySummary } from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const transactionsApi = {
  getAll: (filters?: TransactionFilters) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters?.type) params.append('type', filters.type);
    
    const query = params.toString();
    return fetchJson<TransactionWithCategory[]>(`/transactions${query ? `?${query}` : ''}`);
  },

  create: (data: CreateTransactionInput) => 
    fetchJson<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<CreateTransactionInput>) =>
    fetchJson<Transaction>(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchJson<void>(`/transactions/${id}`, {
      method: 'DELETE',
    }),

  getMonthlySummary: (month: string, year: number) =>
    fetchJson<MonthlySummary>(`/transactions/summary/monthly?month=${month}&year=${year}`),
};

export const categoriesApi = {
  getAll: () => fetchJson<Category[]>('/categories'),
  
  create: (data: { name: string; type: 'income' | 'expense'; color?: string }) =>
    fetchJson<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchJson<void>(`/categories/${id}`, {
      method: 'DELETE',
    }),
};
