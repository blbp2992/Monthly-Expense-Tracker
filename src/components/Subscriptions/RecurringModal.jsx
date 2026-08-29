import React, { useState, useEffect } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { PAYMENT_METHODS } from '../../data/initialData';
import { X, Plus, Check } from 'lucide-react';

export const RecurringModal = () => {
  const {
    isSubModalOpen,
    setIsSubModalOpen,
    editingSub,
    setEditingSub,
    categories,
    addSubscription,
    updateSubscription,
    currency
  } = useExpense();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('cat_subscriptions');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [dueDay, setDueDay] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  useEffect(() => {
    if (editingSub) {
      setName(editingSub.name || '');
      setAmount(editingSub.amount || '');
      setCategoryId(editingSub.categoryId || 'cat_subscriptions');
      setBillingCycle(editingSub.billingCycle || 'monthly');
      setDueDay(editingSub.dueDay || 1);
      setPaymentMethod(editingSub.paymentMethod || 'credit_card');
    } else {
      setName('');
      setAmount('');
      setCategoryId('cat_subscriptions');
      setBillingCycle('monthly');
      setDueDay(1);
      setPaymentMethod('credit_card');
    }
  }, [editingSub, isSubModalOpen]);

  if (!isSubModalOpen) return null;

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) return;

    const payload = {
      name: name.trim(),
      amount: parseFloat(amount),
      categoryId,
      billingCycle,
      dueDay: parseInt(dueDay, 10),
      paymentMethod,
      active: true
    };

    if (editingSub) {
      updateSubscription(editingSub.id, payload);
    } else {
      addSubscription(payload);
    }

    setIsSubModalOpen(false);
    setEditingSub(null);
  };

  return (
    <div className="modal-overlay" onClick={() => setIsSubModalOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {editingSub ? 'Edit Recurring Bill' : 'Add Recurring Bill / Subscription'}
          </h2>
          <button className="btn-icon" onClick={() => setIsSubModalOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="form-group">
            <label className="form-label">Subscription / Bill Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Netflix, Spotify, Gym Membership, Internet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cost ({currency.symbol})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                className="form-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Billing Cycle</label>
              <select
                className="form-input"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {expenseCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Due Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                className="form-input"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select
              className="form-input"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsSubModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingSub ? <Check size={16} /> : <Plus size={16} />}
              <span>{editingSub ? 'Save Changes' : 'Add Subscription'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
