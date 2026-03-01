import React, { useState, useEffect, useMemo } from 'react';
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

  // Sorting
  type SortField = 'date' | 'amount' | 'description' | 'type' | 'categoryName';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Sorting and pagination logic
  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions];
    sorted.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle null/undefined values for categoryName
      if (sortField === 'categoryName') {
        aValue = a.categoryName || '';
        bValue = b.categoryName || '';
      }

      // Date comparison
      if (sortField === 'date') {
        const comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0;
    });
    return sorted;
  }, [transactions, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, currentPage]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page on sort change
  }

  function getSortIndicator(field: SortField) {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
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
    setSortField('date');
    setSortDirection('desc');
    setCurrentPage(1);
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

      <div className="transactions-table-container card">
        <div className="transactions-header">
          <h3>
            Transactions ({sortedTransactions.length})
          </h3>
          {sortedTransactions.length > 0 && (
            <span className="pagination-info">
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedTransactions.length)} of {sortedTransactions.length}
            </span>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions found</p>
          </div>
        ) : sortedTransactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions match the current filters</p>
          </div>
        ) : (
          <>
            <div className="transactions-table-wrapper">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th 
                      className="sortable" 
                      onClick={() => handleSort('type')}
                    >
                      Type {getSortIndicator('type')}
                    </th>
                    <th 
                      className="sortable" 
                      onClick={() => handleSort('date')}
                    >
                      Date {getSortIndicator('date')}
                    </th>
                    <th 
                      className="sortable" 
                      onClick={() => handleSort('description')}
                    >
                      Description {getSortIndicator('description')}
                    </th>
                    <th 
                      className="sortable" 
                      onClick={() => handleSort('categoryName')}
                    >
                      Category {getSortIndicator('categoryName')}
                    </th>
                    <th 
                      className="sortable amount-col" 
                      onClick={() => handleSort('amount')}
                    >
                      Amount {getSortIndicator('amount')}
                    </th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map(t => (
                    <tr key={t.id}>
                      <td>
                        <span className={`type-badge ${t.type}`}>
                          {t.type === 'income' ? '↑' : '↓'} {t.type}
                        </span>
                      </td>
                      <td>{formatDate(t.date)}</td>
                      <td className="description-cell">{t.description}</td>
                      <td>
                        {t.categoryName ? (
                          <span 
                            className="category-badge-table"
                            style={{ 
                              backgroundColor: t.categoryColor || '#6366f1',
                              color: '#fff'
                            }}
                          >
                            {t.categoryName}
                          </span>
                        ) : (
                          <span className="no-category">—</span>
                        )}
                      </td>
                      <td className={`amount-cell ${t.type}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td>
                        <button 
                          className="delete-btn-small"
                          onClick={() => handleDelete(t.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-small"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Prev
                </button>
                
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`page-btn ${page === currentPage ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-small"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
