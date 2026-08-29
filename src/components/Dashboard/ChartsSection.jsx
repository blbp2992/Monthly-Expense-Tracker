import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency, getDaysInMonth } from '../../utils/formatters';
import { PieChart as PieIcon, BarChart3 } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler
);

export const ChartsSection = () => {
  const {
    monthlyMetrics,
    categories,
    currentMonthTransactions,
    selectedYear,
    selectedMonth,
    currency,
    theme
  } = useExpense();

  const { categorySpendMap, totalExpenses } = monthlyMetrics;
  const isDark = theme === 'dark';

  // 1. Prepare Category Doughnut Data
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const spentCategories = expenseCategories.filter((c) => (categorySpendMap[c.id] || 0) > 0);

  const doughnutData = {
    labels: spentCategories.map((c) => c.name),
    datasets: [
      {
        data: spentCategories.map((c) => categorySpendMap[c.id] || 0),
        backgroundColor: spentCategories.map((c) => c.color),
        borderColor: isDark ? '#111827' : '#ffffff',
        borderWidth: 2,
        hoverOffset: 6
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDark ? '#94a3b8' : '#64748b',
          boxWidth: 12,
          boxHeight: 12,
          padding: 12,
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          }
        }
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        titleColor: isDark ? '#f8fafc' : '#0f172a',
        bodyColor: isDark ? '#cbd5e1' : '#334155',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: (context) => {
            const val = context.parsed || 0;
            const percentage = totalExpenses > 0 ? ((val / totalExpenses) * 100).toFixed(1) : 0;
            return ` ${formatCurrency(val, currency.code, currency.symbol)} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Custom center text plugin for exact positioning & responsive auto-fit font sizing
  const centerTextPlugin = useMemo(() => {
    return {
      id: 'doughnutCenterText',
      afterDraw(chart) {
        if (chart.config.type !== 'doughnut') return;
        const { ctx, chartArea } = chart;
        if (!chartArea) return;

        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data.length) return;

        // Exact center coordinates of the doughnut ring
        const x = meta.data[0].x;
        const y = meta.data[0].y;
        const innerRadius = meta.data[0].innerRadius || 65;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const formattedAmount = formatCurrency(totalExpenses, currency.code, currency.symbol);

        // Calculate responsive font size that guaranteed fits within the inner ring width
        const availableWidth = innerRadius * 1.7;
        let fontSize = Math.min(
          17,
          Math.max(11, Math.floor(availableWidth / (formattedAmount.length * 0.62)))
        );

        // Draw Amount Value
        ctx.font = `800 ${fontSize}px 'Outfit', -apple-system, sans-serif`;
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(formattedAmount, x, y - 6);

        // Draw 'TOTAL SPENT' label
        const subFontSize = Math.max(8.5, Math.min(10, Math.floor(fontSize * 0.62)));
        ctx.font = `600 ${subFontSize}px 'Inter', sans-serif`;
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText('TOTAL SPENT', x, y + fontSize * 0.72);

        ctx.restore();
      }
    };
  }, [totalExpenses, currency, isDark]);

  // 2. Prepare Daily Expense Flow (Bar Chart)
  const totalDays = getDaysInMonth(selectedYear, selectedMonth);
  const dailySpendMap = {};
  for (let i = 1; i <= totalDays; i++) {
    dailySpendMap[i] = 0;
  }

  currentMonthTransactions.forEach((tx) => {
    if (tx.type === 'expense' && tx.date) {
      const day = parseInt(tx.date.split('-')[2], 10);
      if (day && dailySpendMap[day] !== undefined) {
        dailySpendMap[day] += Number(tx.amount) || 0;
      }
    }
  });

  const barLabels = Array.from({ length: totalDays }, (_, i) => String(i + 1));
  const barDataValues = barLabels.map((dayStr) => dailySpendMap[parseInt(dayStr, 10)]);

  const dailyBarData = {
    labels: barLabels,
    datasets: [
      {
        label: 'Daily Expenses',
        data: barDataValues,
        backgroundColor: 'rgba(99, 102, 241, 0.75)',
        hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
        borderRadius: 4
      }
    ]
  };

  const dailyBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        titleColor: isDark ? '#f8fafc' : '#0f172a',
        bodyColor: isDark ? '#cbd5e1' : '#334155',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (items) => `Day ${items[0].label} of Month`,
          label: (context) => ` Spent: ${formatCurrency(context.parsed.y, currency.code, currency.symbol)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: isDark ? '#64748b' : '#94a3b8',
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12
        }
      },
      y: {
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          color: isDark ? '#64748b' : '#94a3b8',
          font: { size: 10 },
          callback: (value) => `${currency.symbol}${value}`
        }
      }
    }
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div className="panel-title">
          <BarChart3 size={20} color="var(--primary)" />
          <span>Spending Breakdown & Daily Flow</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem' }}>
        {/* Doughnut Chart */}
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <PieIcon size={15} /> By Category
          </div>
          <div className="chart-container" style={{ height: '300px' }}>
            {spentCategories.length > 0 ? (
              <Doughnut data={doughnutData} options={doughnutOptions} plugins={[centerTextPlugin]} />
            ) : (
              <div className="empty-state" style={{ height: '100%' }}>
                <p>No expenses recorded this month.</p>
              </div>
            )}
          </div>
        </div>

        {/* Daily Bar Chart */}
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BarChart3 size={15} /> Daily Spending Velocity
          </div>
          <div className="chart-container" style={{ height: '300px' }}>
            <Bar data={dailyBarData} options={dailyBarOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};
