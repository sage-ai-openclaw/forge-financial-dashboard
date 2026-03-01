import React, { useState, useEffect } from 'react';
import { budgetsApi, categoriesApi } from '../utils/api';
import type { BudgetWithSpending, BudgetSummary, Category } from '../types';
import './BudgetsPage.css';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    month: String(now.getMonth() + 1),
    year: now.getFullYear(),
  });

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  async function loadData() {
    try {
      setLoading(true);
      const [budgetsData, categoriesData, summaryData] = await Promise.all([
        budgetsApi.getWithSpending(selectedMonth, selectedYear),
        categoriesApi.getAll(),
        budgetsApi.getSummary(selectedMonth, selectedYear),
      ]);
      setBudgets(budgetsData);
      setCategories(categoriesData.filter(c => c.type === 'expense'));
      setSummary(summaryData);
      setError(null);
    } catch (err) {
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await budgetsApi.create({
        categoryId: parseInt(formData.categoryId),
        amount: parseFloat(formData.amount),
        month: formData.month,
        year: formData.year,
      });
      setShowForm(false);
      setFormData({
        categoryId: '',
        amount: '',
        month: String(now.getMonth() + 1),
        year: now.getFullYear(),
      });
      loadData();
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        setError('A budget already exists for this category and period');
      } else {
        setError(err.message || 'Failed to create budget');
      }
    }
  }

  async function handleUpdate(id: number) {
    try {
      await budgetsApi.update(id, parseFloat(editAmount));
      setEditingId(null);
      loadData();
    } catch (err) {
      setError('Failed to update budget');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this budget?')) return;
    try {
      await budgetsApi.delete(id);
      loadData();
    } catch (err) {
      setError('Failed to delete budget');
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  function getBarClass(percentage: number) {
    if (percentage >= 100) return 'over';
    if (percentage >= 80) return 'warning';
    return 'under';
  }

  function getPercentageClass(percentage: number) {
    if (percentage >= 100) return 'over';
    if (percentage >= 80) return 'warning';
    return 'under';
  }

  if (loading) return <div className="loading">Loading budgets...</div>;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="budgets-page">
      <header className="page-header">
        <h1>Budgets</h1>
        <div className="period-selector">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Budget'}
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {summary && (
        <div className="budget-summary">
          <div className="summary-card card budgeted">
            <h4>Budgeted</h4>
            <div className="summary-value">{formatCurrency(summary.totalBudgeted)}</div>
          </div>
          <div className="summary-card card spent">
            <h4>Spent</h4>
            <div className="summary-value">{formatCurrency(summary.totalSpent)}</div>
          </div>
          <div className="summary-card card remaining">
            <h4>Remaining</h4>
            <div className="summary-value">{formatCurrency(summary.totalRemaining)}</div>
          </div>
          <div className="summary-card card over-budget">
            <h4>Over Budget</h4>
            <div className="summary-value">{summary.overBudgetCount}</div>
          </div>
        </div>
      )}

      {showForm && (
        <form className="budget-form card" onSubmit={handleSubmit}>
          <h3>Create New Budget</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                className="form-control"
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                required
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Budget Amount</label>
              <input
                type="number"
                className="form-control"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Month</label>
              <select
                className="form-control"
                value={formData.month}
                onChange={e => setFormData({ ...formData, month: e.target.value })}
                required
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Year</label>
              <select
                className="form-control"
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">Create Budget</button>
        </form>
      )}

      <div className="budgets-list">
        {budgets.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">📊</div>
            <p>No budgets set for {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
            <p>Create a budget to track your spending!</p>
          </div>
        ) : (
          budgets.map(budget => (
            <div key={budget.id} className="budget-item">
              <div className="budget-header">
                <div className="budget-category">
                  <span
                    className="category-dot"
                    style={{ backgroundColor: budget.categoryColor }}
                  />
                  <span className="category-name">{budget.categoryName}</span>
                </div>
                
                <div className="budget-actions">
                  {editingId === budget.id ? (
                    <div className="edit-form">
                      <input
                        type="number"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        autoFocus
                      />
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleUpdate(budget.id)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={`percentage-badge ${getPercentageClass(budget.percentageUsed)}`}>
                        {Math.round(budget.percentageUsed)}%
                      </span>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          setEditingId(budget.id);
                          setEditAmount(budget.amount.toString());
                        }}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(budget.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="budget-bar">
                <div
                  className={`budget-bar-fill ${getBarClass(budget.percentageUsed)}`}
                  style={{ width: `${Math.min(100, budget.percentageUsed)}%` }}
                />
              </div>

              <div className="budget-details">
                <div className="budget-amounts">
                  <span>Budget: {formatCurrency(budget.amount)}</span>
                  <span className="spent-amount">Spent: {formatCurrency(budget.spent)}</span>
                  {budget.remaining >= 0 ? (
                    <span className="remaining-amount">
                      Remaining: {formatCurrency(budget.remaining)}
                    </span>
                  ) : (
                    <span className="over-amount">
                      Over: {formatCurrency(Math.abs(budget.remaining))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
