import React, { useState, useEffect } from 'react';
import { transactionsApi } from '../utils/api';
import type { MonthlySummary, TransactionWithCategory } from '../types';
import './DashboardPage.css';

export function DashboardPage() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    loadDashboardData();
  }, [selectedMonth]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      
      const [summaryData, recentTxns] = await Promise.all([
        transactionsApi.getMonthlySummary(month, parseInt(year)),
        transactionsApi.getAll({ 
          startDate: `${selectedMonth}-01`,
          endDate: `${selectedMonth}-31`,
          limit: 5 
        }),
      ]);
      
      setSummary(summaryData);
      setTransactions(recentTxns);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
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
      month: 'short',
      day: 'numeric',
    });
  };

  // Simple bar chart component
  function SimpleBarChart({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) {
    return (
      <div className="simple-bar-chart">
        {data.map((item, idx) => (
          <div key={idx} className="bar-row">
            <span className="bar-label">{item.label}</span>
            <div className="bar-container">
              <div
                className="bar-fill"
                style={{
                  width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
            <span className="bar-value">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const chartData = summary?.categoryBreakdown
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(c => ({
      label: c.categoryName,
      value: c.amount,
      color: c.categoryColor || '#6366f1',
    })) || [];

  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="month-selector">
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="form-control"
          />
        </div>
      </header>

      <div className="summary-cards">
        <div className="summary-card income">
          <span className="card-label">Income</span>
          <span className="card-value">{formatCurrency(summary?.totalIncome || 0)}</span>
        </div>
        
        <div className="summary-card expense">
          <span className="card-label">Expenses</span>
          <span className="card-value">{formatCurrency(summary?.totalExpense || 0)}</span>
        </div>
        
        <div className={`summary-card net ${(summary?.netAmount || 0) >= 0 ? 'positive' : 'negative'}`}>
          <span className="card-label">Net</span>
          <span className="card-value">{formatCurrency(summary?.netAmount || 0)}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-section card">
          <h3>📊 Spending by Category</h3>
          {chartData.length === 0 ? (
            <p className="empty-text">No expense data for this month</p>
          ) : (
            <SimpleBarChart data={chartData} maxValue={maxChartValue} />
          )}
        </section>

        <section className="dashboard-section card">
          <h3>📝 Recent Transactions</h3>
          {transactions.length === 0 ? (
            <p className="empty-text">No transactions this month</p>
          ) : (
            <div className="recent-transactions">
              {transactions.map(t => (
                <div key={t.id} className="recent-item">
                  <div className="recent-info">
                    <span className="recent-desc">{t.description}</span>
                    <span className="recent-date">{formatDate(t.date)}</span>
                  </div>
                  <span className={`recent-amount ${t.type}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
