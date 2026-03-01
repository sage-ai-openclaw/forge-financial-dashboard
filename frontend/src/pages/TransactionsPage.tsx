import React, { useState, useEffect } from 'react';
import { transactionsApi, categoriesApi } from '../utils/api';
import type { TransactionWithCategory, Category, CreateTransactionInput } from '../types';
import './TransactionsPage.css';

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<'income' | 'expense' | ''>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<CreateTransactionInput>({
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filterType, filterCategory, filterStartDate, filterEndDate]);

  async function loadData() {
    try {
      setLoading(true);
      const [txns, cats] = await Promise.all([
        transactionsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setTransactions(txns);
      setCategories(cats);
      setError(null);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function applyFilters() {
    try {
      const filters: Parameters<typeof transactionsApi.getAll>[0] = {};
      if (filterType) filters.type = filterType;
      if (filterCategory) filters.categoryId = parseInt(filterCategory);
      if (filterStartDate) filters.startDate = filterStartDate;
      if (filterEndDate) filters.endDate = filterEndDate;

      const txns = await transactionsApi.getAll(filters);
      setTransactions(txns);
    } catch (err) {
      setError('Failed to apply filters');
    }
  }

  function clearFilters() {
    setFilterType('');
    setFilterCategory('');
    setFilterStartDate('');
    setFilterEndDate('');
    loadData();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await transactionsApi.create({
        ...formData,
        categoryId: formData.categoryId ? parseInt(formData.categoryId.toString()) : undefined,
      });
      setShowForm(false);
      setFormData({
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
      });
      loadData();
    } catch (err) {
      setError('Failed to create transaction');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this transaction?')) return;
    try {
      await transactionsApi.delete(id);
      loadData();
    } catch (err) {
      setError('Failed to delete transaction');
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="transactions-page">
      <header className="page-header">
        <h1>Transactions</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Transaction'}
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form className="transaction-form card" onSubmit={handleSubmit}>
          <h3>New Transaction</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select
                className="form-control"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                value={formData.amount || ''}
                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              className="form-control"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="What was this for?"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                className="form-control"
                value={formData.categoryId || ''}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value ? parseInt(e.target.value) : undefined })}
              >
                <option value="">-- Select --</option>
                {categories
                  .filter(c => c.type === formData.type)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">Save Transaction</button>
        </form>
      )}

      <div className="filters card">
        <h3>Filters</h3>
        <div className="filters-row">
          <div className="filter-group">
            <label>Type</label>
            <select
              className="form-control"
              value={filterType}
              onChange={e => setFilterType(e.target.value as 'income' | 'expense' | '')}
            >
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select
              className="form-control"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="">All</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>From</label>
            <input
              type="date"
              className="form-control"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>To</label>
            <input
              type="date"
              className="form-control"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
            />
          </div>

          <button className="btn btn-secondary" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      <div className="transactions-list">
        {transactions.length === 0 ? (
          <div className="empty-state card">
            <p>No transactions found</p>
          </div>
        ) : (
          transactions.map(t => (
            <div key={t.id} className="transaction-item card">
              <div className="transaction-main">
                <div className={`transaction-type ${t.type}`}>
                  {t.type === 'income' ? '↑' : '↓'}
                </div>
                <div className="transaction-info">
                  <div className="transaction-description">{t.description}</div>
                  <div className="transaction-meta">
                    {formatDate(t.date)}
                    {t.categoryName && (
                      <span 
                        className="category-badge"
                        style={{ backgroundColor: t.categoryColor || '#6366f1' }}
                      >
                        {t.categoryName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={`transaction-amount ${t.type}`}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </div>

              <button 
                className="delete-btn"
                onClick={() => handleDelete(t.id)}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
