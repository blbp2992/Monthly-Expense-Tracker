import React from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency } from '../../utils/formatters';
import { CategoryIcon } from '../UI/CategoryIcon';
import { RecurringModal } from './RecurringModal';
import {
  Repeat,
  Plus,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  CheckCircle,
  PlusCircle
} from 'lucide-react';

export const RecurringTracker = () => {
  const {
    subscriptions,
    categories,
    currency,
    toggleSubscription,
    deleteSubscription,
    setEditingSub,
    setIsSubModalOpen,
    addTransaction,
    selectedYear,
    selectedMonth,
    addToast
  } = useExpense();

  const totalMonthlyCost = subscriptions
    .filter((s) => s.active)
    .reduce((acc, s) => {
      const amt = Number(s.amount) || 0;
      return acc + (s.billingCycle === 'yearly' ? amt / 12 : amt);
    }, 0);

  const getCategory = (catId) => {
    return (
      categories.find((c) => c.id === catId) || {
        name: 'Subscriptions',
        color: '#a855f7',
        icon: 'CalendarSync'
      }
    );
  };

  const handleEdit = (sub) => {
    setEditingSub(sub);
    setIsSubModalOpen(true);
  };

  const handleDelete = (sub) => {
    if (window.confirm(`Delete subscription "${sub.name}"?`)) {
      deleteSubscription(sub.id);
    }
  };

  // Quick Log as Transaction
  const handleLogAsTransaction = (sub) => {
    const paddedDay = String(sub.dueDay).padStart(2, '0');
    const dateStr = `${selectedYear}-${selectedMonth}-${paddedDay}`;

    addTransaction({
      type: 'expense',
      amount: sub.amount,
      categoryId: sub.categoryId || 'cat_subscriptions',
      date: dateStr,
      paymentMethod: sub.paymentMethod || 'credit_card',
      description: `${sub.name} (Recurring)`,
      notes: `Autopay / recurring bill for ${selectedMonth}/${selectedYear}`
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Repeat size={22} color="var(--primary)" />
            <span>Recurring Bills & Subscriptions</span>
          </div>
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
            onClick={() => {
              setEditingSub(null);
              setIsSubModalOpen(true);
            }}
          >
            <Plus size={15} />
            <span>Add Recurring Bill</span>
          </button>
        </div>

        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="metric-card">
            <span className="metric-title">Total Monthly Subscriptions</span>
            <div className="metric-value" style={{ color: 'var(--accent-purple)' }}>
              {formatCurrency(totalMonthlyCost, currency.code, currency.symbol)}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/mo</span>
            </div>
            <div className="metric-footer">
              <span>{subscriptions.filter((s) => s.active).length} active subscriptions</span>
            </div>
          </div>

          <div className="metric-card">
            <span className="metric-title">Annualized Cost</span>
            <div className="metric-value" style={{ color: 'var(--text-main)' }}>
              {formatCurrency(totalMonthlyCost * 12, currency.code, currency.symbol)}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/yr</span>
            </div>
            <div className="metric-footer">
              <span>Estimated yearly recurring commitment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <span>Active Services & Scheduled Bills</span>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Repeat size={28} />
            </div>
            <h3>No recurring bills tracked</h3>
            <p>Add your Netflix, Spotify, Gym, Rent, or utilities to keep track of upcoming charges.</p>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setEditingSub(null);
                setIsSubModalOpen(true);
              }}
            >
              <Plus size={15} />
              <span>Add Your First Bill</span>
            </button>
          </div>
        ) : (
          <div className="sub-grid">
            {subscriptions.map((sub) => {
              const cat = getCategory(sub.categoryId);
              return (
                <div
                  key={sub.id}
                  className="sub-card"
                  style={{ opacity: sub.active ? 1 : 0.6 }}
                >
                  <div className="sub-header">
                    <div className="sub-meta">
                      <div
                        className="category-pill"
                        style={{
                          width: '38px',
                          height: '38px',
                          backgroundColor: `${cat.color}22`,
                          color: cat.color
                        }}
                      >
                        <CategoryIcon name={cat.icon} size={18} color={cat.color} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sub.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {cat.name}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 800,
                          fontSize: '1.1rem'
                        }}
                      >
                        {formatCurrency(sub.amount, currency.code, currency.symbol)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        /{sub.billingCycle}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-input)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} />
                      <span>Due on day {sub.dueDay}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CreditCard size={14} />
                      <span style={{ textTransform: 'capitalize' }}>
                        {sub.paymentMethod.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', gap: '0.35rem' }}
                      title={`Add ${sub.name} to ${selectedMonth}/${selectedYear} transactions`}
                      onClick={() => handleLogAsTransaction(sub)}
                    >
                      <PlusCircle size={14} />
                      <span>Log to {selectedMonth}/{selectedYear}</span>
                    </button>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        className="btn-icon"
                        style={{ width: '32px', height: '32px' }}
                        title="Edit"
                        onClick={() => handleEdit(sub)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ width: '32px', height: '32px', color: 'var(--expense-red)' }}
                        title="Delete"
                        onClick={() => handleDelete(sub)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RecurringModal />
    </div>
  );
};
