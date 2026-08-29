import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency, getMonthName } from '../../utils/formatters';
import { PAYMENT_METHODS } from '../../data/initialData';
import { CategoryIcon } from '../UI/CategoryIcon';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Flame,
  PieChart as PieIcon,
  Layers
} from 'lucide-react';

export const DeepAnalytics = () => {
  const {
    transactions,
    currentMonthTransactions,
    categories,
    currency,
    theme,
    selectedYear,
    selectedMonth,
    monthlyMetrics
  } = useExpense();

  const isDark = theme === 'dark';
  const { totalExpenses, totalIncome } = monthlyMetrics;

  // 1. Month-over-Month 6 Months Historical Bar Chart
  const last6Months = [];
  const now = new Date(selectedYear, parseInt(selectedMonth, 10) - 1, 1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    last6Months.push({
      key: `${y}-${m}`,
      label: `${d.toLocaleString('en-US', { month: 'short' })} ${y}`
    });
  }

  const momIncomeData = [];
  const momExpenseData = [];

  last6Months.forEach((monthItem) => {
    let inc = 0;
    let exp = 0;
    transactions.forEach((tx) => {
      if (tx.date && tx.date.startsWith(monthItem.key)) {
        if (tx.type === 'income') inc += Number(tx.amount) || 0;
        if (tx.type === 'expense') exp += Number(tx.amount) || 0;
      }
    });
    momIncomeData.push(inc);
    momExpenseData.push(exp);
  });

  const momChartData = {
    labels: last6Months.map((m) => m.label),
    datasets: [
      {
        label: 'Income',
        data: momIncomeData,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 4
      },
      {
        label: 'Expense',
        data: momExpenseData,
        backgroundColor: 'rgba(244, 63, 94, 0.8)',
        borderRadius: 4
      }
    ]
  };

  const momChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDark ? '#94a3b8' : '#64748b',
          font: { family: "'Inter', sans-serif", size: 11 }
        }
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        titleColor: isDark ? '#f8fafc' : '#0f172a',
        bodyColor: isDark ? '#cbd5e1' : '#334155',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${formatCurrency(context.parsed.y, currency.code, currency.symbol)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? '#64748b' : '#94a3b8' }
      },
      y: {
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
        ticks: {
          color: isDark ? '#64748b' : '#94a3b8',
          callback: (val) => `${currency.symbol}${val}`
        }
      }
    }
  };

  // 2. Payment Methods Distribution
  const paymentSpendMap = {};
  currentMonthTransactions.forEach((tx) => {
    if (tx.type === 'expense') {
      const pm = tx.paymentMethod || 'other';
      paymentSpendMap[pm] = (paymentSpendMap[pm] || 0) + (Number(tx.amount) || 0);
    }
  });

  const paymentLabels = Object.keys(paymentSpendMap).map((pmKey) => {
    const pm = PAYMENT_METHODS.find((p) => p.id === pmKey);
    return pm ? pm.name : pmKey;
  });

  const paymentChartData = {
    labels: paymentLabels,
    datasets: [
      {
        data: Object.values(paymentSpendMap),
        backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
        borderColor: isDark ? '#111827' : '#ffffff',
        borderWidth: 2
      }
    ]
  };

  // 3. Top 5 Largest Expenses this Month
  const topExpenses = [...currentMonthTransactions]
    .filter((tx) => tx.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const getCategory = (catId) => {
    return (
      categories.find((c) => c.id === catId) || {
        name: 'Uncategorized',
        color: '#64748b',
        icon: 'CircleDollarSign'
      }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Historical Trend Chart */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <TrendingUp size={22} color="var(--primary)" />
            <span>6-Month Cash Flow Trend (Income vs Expenses)</span>
          </div>
        </div>
        <div className="chart-container" style={{ height: '320px' }}>
          <Bar data={momChartData} options={momChartOptions} />
        </div>
      </div>

      {/* Grid: Top 5 Outflows & Payment Method Breakdown */}
      <div className="dashboard-grid">
        {/* Top 5 Expenses */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Flame size={20} color="var(--expense-red)" />
              <span>Top 5 Largest Outflows</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {selectedMonth}/{selectedYear}
            </span>
          </div>

          {topExpenses.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <p>No expenses found for this month.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {topExpenses.map((tx, idx) => {
                const cat = getCategory(tx.categoryId);
                const percentOfTotal = totalExpenses > 0 ? ((tx.amount / totalExpenses) * 100).toFixed(1) : 0;
                return (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          color: 'var(--text-subtle)',
                          width: '18px'
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <div
                        className="category-pill"
                        style={{
                          backgroundColor: `${cat.color}22`,
                          color: cat.color
                        }}
                      >
                        <CategoryIcon name={cat.icon} size={16} color={cat.color} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tx.description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {cat.name} • {percentOfTotal}% of total spend
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-heading)',
                          color: 'var(--expense-red)',
                          fontSize: '0.95rem'
                        }}
                      >
                        {formatCurrency(tx.amount, currency.code, currency.symbol)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <CreditCard size={20} color="var(--accent-cyan)" />
              <span>Spend by Payment Channel</span>
            </div>
          </div>

          <div className="chart-container" style={{ height: '260px' }}>
            {Object.keys(paymentSpendMap).length > 0 ? (
              <Doughnut
                data={paymentChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        boxWidth: 12,
                        padding: 12,
                        font: { size: 11 }
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` ${formatCurrency(ctx.parsed, currency.code, currency.symbol)}`
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="empty-state" style={{ height: '100%' }}>
                <p>No transactions this month.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
