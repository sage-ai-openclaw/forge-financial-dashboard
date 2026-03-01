import React, { useState, useEffect } from 'react';
import { categoriesApi } from '../utils/api';
import type { Category } from '../types';
import './CategoriesPage.css';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#525252', '#404040', '#171717',
];

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: PRESET_COLORS[0],
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await categoriesApi.getAll();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await categoriesApi.create(formData);
      setShowForm(false);
      setFormData({ name: '', type: 'expense', color: PRESET_COLORS[0] });
      loadCategories();
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        setError('Category with this name already exists');
      } else {
        setError('Failed to create category');
      }
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await categoriesApi.delete(id);
      loadCategories();
    } catch (err) {
      setError('Failed to delete category');
    }
  }

  if (loading) return <div className="loading">Loading categories...</div>;

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="categories-page">
      <header className="page-header">
        <h1>Categories</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Category'}
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form className="category-form card" onSubmit={handleSubmit}>
          <h3>Create New Category</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Transportation"
                required
              />
            </div>

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
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="color-grid">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-btn ${formData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary">Create Category</button>
        </form>
      )}

      <div className="categories-grid">
        <section className="category-section card">
          <h3>💰 Income Categories</h3>
          {incomeCategories.length === 0 ? (
            <p className="empty-text">No income categories</p>
          ) : (
            <div className="category-list">
              {incomeCategories.map(cat => (
                <div key={cat.id} className="category-item">
                  <span 
                    className="category-dot"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="category-name">{cat.name}</span>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(cat.id, cat.name)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="category-section card">
          <h3>💸 Expense Categories</h3>
          {expenseCategories.length === 0 ? (
            <p className="empty-text">No expense categories</p>
          ) : (
            <div className="category-list">
              {expenseCategories.map(cat => (
                <div key={cat.id} className="category-item">
                  <span 
                    className="category-dot"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="category-name">{cat.name}</span>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(cat.id, cat.name)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
