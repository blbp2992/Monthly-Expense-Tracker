import React from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency } from '../../utils/formatters';
import { CategoryIcon } from '../UI/CategoryIcon';
import { Target, ChevronRight, AlertTriangle } from 'lucide-react';

export const BudgetProgress = () => {
  const {
    categories,
    budgets,
    monthlyMetrics,
    currency,
    setActiveTab
  } = useExpense();

  const { categorySpendMap } = monthlyMetrics;

  // Filter categories that have a budget set or have spending
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const budgetItems = expenseCategories
    .map((cat) => {
      const spent = categorySpendMap[cat.id] || 0;
      const budget = budgets[cat.id] || 0;
      const percentage = budget > 0 ? Math.round((spent / budget) * 100) : spent > 0 ? 100 : 0;
      const remaining = Math.max(0, budget - spent);
      const isOver = budget > 0 && spent > budget;

      return {
        ...cat,
        spent,
        budget,
        percentage,
        remaining,
        isOver
      };
    })
    .filter((item) => item.budget > 0 || item.spent > 0)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5); // Show top 5 for dashboard glance

  return (
    <div className="glass-panel" style={{ height: '100%' }}>
      <div className="panel-header">
        <div className="panel-title">
          <Target size={20} color="var(--primary)" />
          <span>Category Budgets</span>
        </div>
        <button
          className="btn btn-ghost"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
          onClick={() => setActiveTab('budgets')}
        >
          <span>View All</span>
          <ChevronRight size={15} />
        </button>
      </div>

      {budgetItems.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
          <p>No budget targets set for this month.</p>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
            onClick={() => setActiveTab('budgets')}
          >
            Set Category Budgets
          </button>
        </div>
      ) : (
        <div className="budget-list">
          {budgetItems.map((item) => {
            let statusClass = 'normal';
            if (item.percentage >= 100) {
              statusClass = 'danger';
            } else if (item.percentage >= 80) {
              statusClass = 'warning';
            }

            return (
              <div key={item.id} className="budget-item">
                <div className="budget-item-header">
                  <div className="budget-category-info">
                    <div
                      className="category-pill"
                      style={{ backgroundColor: `${item.color}22`, color: item.color }}
                    >
                      <CategoryIcon name={item.icon} size={15} color={item.color} />
                    </div>
                    <span>{item.name}</span>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {item.isOver && (
                      <AlertTriangle size={14} color="var(--expense-red)" title="Over budget!" />
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                      {formatCurrency(item.spent, currency.code, currency.symbol)}
                    </span>
                    {item.budget > 0 && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        / {formatCurrency(item.budget, currency.code, currency.symbol)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="progress-track">
                  <div
                    className={`progress-fill ${statusClass}`}
                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                  />
                </div>

                <div className="budget-meta-row">
                  <span style={{ color: item.isOver ? 'var(--expense-red)' : 'var(--text-muted)' }}>
                    {item.budget > 0
                      ? item.isOver
                        ? `Over by ${formatCurrency(item.spent - item.budget, currency.code, currency.symbol)}`
                        : `${formatCurrency(item.remaining, currency.code, currency.symbol)} remaining`
                      : 'No target set'}
                  </span>
                  <span style={{ fontWeight: 600 }}>{item.percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
