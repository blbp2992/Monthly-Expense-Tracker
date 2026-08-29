import React, { useState, useEffect } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { PAYMENT_METHODS } from '../../data/initialData';
import { X, Plus, Check, Sparkles, FileSpreadsheet } from 'lucide-react';

export const TransactionModal = () => {
  const {
    isTxModalOpen,
    setIsTxModalOpen,
    editingTx,
    setEditingTx,
    categories,
    addTransaction,
    updateTransaction,
    setIsReceiptScannerOpen,
    setIsFileImportOpen,
    selectedYear,
    selectedMonth,
    currency
  } = useExpense();

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Pre-fill form when editing or opening
  useEffect(() => {
    if (editingTx) {
      setType(editingTx.type || 'expense');
      setAmount(editingTx.amount || '');
      setCategoryId(editingTx.categoryId || '');
      setDate(editingTx.date || '');
      setPaymentMethod(editingTx.paymentMethod || 'credit_card');
      setDescription(editingTx.description || '');
      setNotes(editingTx.notes || '');
    } else {
      const now = new Date();
      const todayString = now.toISOString().slice(0, 10);
      const defaultDate = todayString.startsWith(`${selectedYear}-${selectedMonth}`)
        ? todayString
        : `${selectedYear}-${selectedMonth}-01`;

      setType('expense');
      setAmount('');
      const defaultExpenseCat = categories.find((c) => c.type === 'expense');
      setCategoryId(defaultExpenseCat ? defaultExpenseCat.id : '');
      setDate(defaultDate);
      setPaymentMethod('credit_card');
      setDescription('');
      setNotes('');
    }
  }, [editingTx, isTxModalOpen, categories, selectedYear, selectedMonth]);

  const handleTypeChange = (newType) => {
    setType(newType);
    const available = categories.find((c) => c.type === newType);
    if (available) {
      setCategoryId(available.id);
    }
  };

  if (!isTxModalOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    if (!categoryId) return;
    if (!description.trim()) return;

    const payload = {
      type,
      amount: parseFloat(amount),
      categoryId,
      date,
      paymentMethod,
      description: description.trim(),
      notes: notes.trim(),
      receiptImage: editingTx?.receiptImage,
      receiptItems: editingTx?.receiptItems
    };

    if (editingTx) {
      updateTransaction(editingTx.id, payload);
    } else {
      addTransaction(payload);
    }

    setIsTxModalOpen(false);
    setEditingTx(null);
  };

  const handleOpenScanner = () => {
    setIsTxModalOpen(false);
    setIsReceiptScannerOpen(true);
  };

  const handleOpenFileImport = () => {
    setIsTxModalOpen(false);
    setIsFileImportOpen(true);
  };

  return (
    <div className="modal-overlay" onClick={() => setIsTxModalOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {editingTx ? 'Edit Transaction' : 'Add New Transaction'}
          </h2>
          <button
            className="btn-icon"
            onClick={() => setIsTxModalOpen(false)}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* AI Scanner & CSV/Excel Import Fast Banners */}
        {!editingTx && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, hsla(239, 84%, 67%, 0.1) 0%, hsla(270, 75%, 60%, 0.1) 100%)',
                border: '1px solid var(--border-highlight)',
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Have a receipt? Let AI autofill and break down items!
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                onClick={handleOpenScanner}
              >
                Scan Receipt
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'hsla(158, 79%, 42%, 0.08)',
                border: '1px solid hsla(158, 79%, 42%, 0.25)',
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={16} color="var(--income-green)" />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Have multiple rows? Import via CSV or Excel file!
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                onClick={handleOpenFileImport}
              >
                Import CSV / Excel
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Type Toggle: Expense / Income */}
          <div className="type-toggle-group">
            <button
              type="button"
              className={`type-toggle-btn ${type === 'expense' ? 'active-expense' : ''}`}
              onClick={() => handleTypeChange('expense')}
            >
              Expense
            </button>
            <button
              type="button"
              className={`type-toggle-btn ${type === 'income' ? 'active-income' : ''}`}
              onClick={() => handleTypeChange('income')}
            >
              Income
            </button>
          </div>

          {/* Amount & Date */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount ({currency.symbol})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                className="form-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
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
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Grocery restock, Dinner with team, Monthly Salary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Notes (Optional) */}
          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Shared with roommates, Invoice #104"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsTxModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingTx ? <Check size={16} /> : <Plus size={16} />}
              <span>{editingTx ? 'Save Changes' : 'Add Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
