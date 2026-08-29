import React from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency } from '../../utils/formatters';
import {
  TrendingDown,
  CalendarClock,
  ArrowDownRight
} from 'lucide-react';

export const SummaryCards = () => {
  const { monthlyMetrics, currency } = useExpense();
  const {
    totalExpenses,
    safeDailyAllowance,
    remainingDays
  } = monthlyMetrics;

  return (
    <div className="metrics-grid">
      {/* Total Expenses */}
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Total Expenses</span>
          <div className="metric-icon-wrap metric-icon-expense">
            <TrendingDown size={20} />
          </div>
        </div>
        <div className="metric-value" style={{ color: 'var(--expense-red)' }}>
          {formatCurrency(totalExpenses, currency.code, currency.symbol)}
        </div>
        <div className="metric-footer">
          <span className="badge-tag badge-expense">
            <ArrowDownRight size={12} /> Cash Out
          </span>
          <span>Spent this month</span>
        </div>
      </div>

      {/* Daily Safe Allowance */}
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Daily Safe Spend</span>
          <div className="metric-icon-wrap metric-icon-allowance">
            <CalendarClock size={20} />
          </div>
        </div>
        <div className="metric-value" style={{ color: 'var(--warning-amber)' }}>
          {formatCurrency(safeDailyAllowance, currency.code, currency.symbol)}
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/day</span>
        </div>
        <div className="metric-footer">
          <span className="badge-tag badge-neutral">
            {remainingDays} days left
          </span>
          <span>within budget</span>
        </div>
      </div>
    </div>
  );
};
