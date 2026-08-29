import React, { useState, useRef } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency } from '../../utils/formatters';
import { CategoryIcon } from '../UI/CategoryIcon';
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Edit3
} from 'lucide-react';

export const BudgetManager = () => {
  const {
    categories,
    budgets,
    updateCategoryBudget,
    updateCategoryName,
    monthlyMetrics,
    currency,
    selectedMonth,
    selectedYear
  } = useExpense();

  const { totalBudget, totalExpenses, budgetRemaining, budgetUsagePercent } = monthlyMetrics;
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const [editingCatId, setEditingCatId] = useState(null);
  const [tempBudgetAmount, setTempBudgetAmount] = useState('');
  const [editingNameId, setEditingNameId] = useState(null);
  const [tempName, setTempName] = useState('');
  const nameInputRef = useRef(null);

  const handleStartNameEdit = (catId, currentName) => {
    setEditingNameId(catId);
    setTempName(currentName);
    // focus happens via autoFocus on the input
  };

  const handleSaveName = (catId) => {
    updateCategoryName(catId, tempName);
    setEditingNameId(null);
  };

  const handleStartEdit = (catId, currentVal) => {
    setEditingCatId(catId);
    setTempBudgetAmount(currentVal || '');
  };

  const handleSaveBudget = (catId) => {
    updateCategoryBudget(catId, tempBudgetAmount);
    setEditingCatId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Cards */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Target size={22} color="var(--primary)" />
            <span>Monthly Budget Overview</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Status for Month {selectedMonth}/{selectedYear}
          </div>
        </div>

        <div className="metrics-grid">
          {/* Total Budget Target */}
          <div className="metric-card">
            <span className="metric-title">Total Allocated Budget</span>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>
              {formatCurrency(totalBudget, currency.code, currency.symbol)}
            </div>
            <div className="metric-footer">
              <span>Sum of all category targets</span>
            </div>
          </div>

          {/* Spent So Far */}
          <div className="metric-card">
            <span className="metric-title">Spent So Far</span>
            <div className="metric-value" style={{ color: 'var(--expense-red)' }}>
              {formatCurrency(totalExpenses, currency.code, currency.symbol)}
            </div>
            <div className="metric-footer">
              <span className={`badge-tag ${budgetUsagePercent > 100 ? 'badge-expense' : 'badge-income'}`}>
                {budgetUsagePercent}% of budget used
              </span>
            </div>
          </div>

          {/* Remaining Budget */}
          <div className="metric-card">
            <span className="metric-title">Remaining Monthly Safe Buffer</span>
            <div
              className="metric-value"
              style={{
                color: budgetRemaining > 0 ? 'var(--income-green)' : 'var(--expense-red)'
              }}
            >
              {formatCurrency(budgetRemaining, currency.code, currency.symbol)}
            </div>
            <div className="metric-footer">
              {budgetRemaining > 0 ? (
                <span className="badge-tag badge-income">
                  <CheckCircle2 size={12} /> On Track
                </span>
              ) : (
                <span className="badge-tag badge-expense">
                  <AlertTriangle size={12} /> Budget Exceeded
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Budgets Grid */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Sparkles size={20} color="var(--primary)" />
            <span>Category Budget Allocations</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Click edit to adjust monthly limits
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}
        >
          {expenseCategories.map((cat) => {
            const spent = monthlyMetrics.categorySpendMap[cat.id] || 0;
            const target = budgets[cat.id] || 0;
            const isEditing = editingCatId === cat.id;
            const percent = target > 0 ? Math.round((spent / target) * 100) : spent > 0 ? 100 : 0;
            const isOver = target > 0 && spent > target;
            const remaining = Math.max(0, target - spent);

            let statusColor = 'var(--primary)';
            if (percent >= 100) {
              statusColor = 'var(--expense-red)';
            } else if (percent >= 80) {
              statusColor = 'var(--warning-amber)';
            }

            return (
              <div
                key={cat.id}
                style={{
                  background: 'var(--bg-card)',
                  border: isOver ? '1px solid var(--expense-red)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.9rem',
                  transition: 'all var(--transition-normal)'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      className="category-pill"
                      style={{
                        width: '36px',
                        height: '36px',
                        backgroundColor: `${cat.color}22`,
                        color: cat.color
                      }}
                    >
                      <CategoryIcon name={cat.icon} size={18} color={cat.color} />
                    </div>
                    <div>
                      {editingNameId === cat.id ? (
                        <input
                          autoFocus
                          ref={nameInputRef}
                          type="text"
                          className="form-input"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            width: '140px'
                          }}
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onBlur={() => handleSaveName(cat.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName(cat.id);
                            if (e.key === 'Escape') setEditingNameId(null);
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                          title="Click to rename"
                          onClick={() => handleStartNameEdit(cat.id, cat.name)}
                        >
                          {cat.name}
                          <Edit3 size={12} style={{ opacity: 0.45, flexShrink: 0 }} />
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Spent: {formatCurrency(spent, currency.code, currency.symbol)}
                      </div>
                    </div>
                  </div>

                  {!isEditing ? (
                    <button
                      className="btn-icon"
                      style={{ width: '32px', height: '32px' }}
                      title="Edit Budget Target"
                      onClick={() => handleStartEdit(cat.id, target)}
                    >
                      <Edit3 size={14} />
                    </button>
                  ) : null}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="progress-track" style={{ height: '10px' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, percent)}%`,
                        backgroundColor: statusColor
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '0.4rem',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <span>{percent}% Used</span>
                    <span>
                      {target > 0
                        ? isOver
                          ? `Over by ${formatCurrency(spent - target, currency.code, currency.symbol)}`
                          : `${formatCurrency(remaining, currency.code, currency.symbol)} left`
                        : 'No Target Set'}
                    </span>
                  </div>
                </div>

                {/* Target Editor Form or Info */}
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      className="form-input"
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.88rem' }}
                      placeholder="Enter target amount"
                      value={tempBudgetAmount}
                      onChange={(e) => setTempBudgetAmount(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                      onClick={() => handleSaveBudget(cat.id)}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
                      onClick={() => setEditingCatId(null)}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-input)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem'
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Target Limit:</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                      {target > 0
                        ? formatCurrency(target, currency.code, currency.symbol)
                        : 'Not Set'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
