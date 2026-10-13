import React from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  getCategoryAllocations,
  getItemsTotal,
  fixLineTotalPrices,
  TALLY_TOLERANCE
} from '../../utils/receiptCategories';
import { CategoryIcon } from '../UI/CategoryIcon';
import { X, ShoppingCart, AlertCircle, CheckCircle2, Trash2, Wand2 } from 'lucide-react';

export const ReceiptViewerModal = () => {
  const {
    receiptViewerTx,
    setReceiptViewerTx,
    transactions,
    categories,
    currency,
    updateReceiptItemCategory,
    updateReceiptItems,
    addToast
  } = useExpense();

  if (!receiptViewerTx) return null;

  // Read the live transaction so category edits show immediately
  const tx = transactions.find((t) => t.id === receiptViewerTx.id) || receiptViewerTx;
  const getCategory = (id) =>
    categories.find((c) => c.id === id) || {
      name: 'Expense',
      color: '#6366f1',
      icon: 'Receipt'
    };
  const cat = getCategory(tx.categoryId);

  const hasItems = tx.receiptItems && tx.receiptItems.length > 0;
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const allocations = getCategoryAllocations(tx).sort((a, b) => b.amount - a.amount);

  const money = (value) => formatCurrency(value, currency.code, currency.symbol);
  const itemsTotal = hasItems ? getItemsTotal(tx.receiptItems) : 0;
  const itemsDiff = itemsTotal - (Number(tx.amount) || 0);
  const itemsTally = Math.abs(itemsDiff) <= TALLY_TOLERANCE;
  const priceFix = hasItems && !itemsTally ? fixLineTotalPrices(tx.receiptItems, tx.amount) : null;

  const lineAmount = (item) => (Number(item.price) || 0) * (Number(item.qty) || 1);

  // Edits keep the amount paid; the line amount is what's printed on the receipt
  const handleLineChange = (index, field, rawValue) => {
    const item = tx.receiptItems[index];
    const value = parseFloat(rawValue);
    if (!Number.isFinite(value)) return;
    const qty = field === 'qty' ? Math.max(1, Math.round(value)) : Number(item.qty) || 1;
    const amount = field === 'amount' ? value : lineAmount(item);
    if (qty === (Number(item.qty) || 1) && Math.abs(amount - lineAmount(item)) < 0.005) return;
    const receiptItems = tx.receiptItems.map((it, i) =>
      i === index ? { ...it, qty, price: Math.round((amount / qty) * 10000) / 10000 } : it
    );
    updateReceiptItems(tx.id, receiptItems);
  };

  const handleDeleteLine = (index) => {
    if (!window.confirm(`Remove "${tx.receiptItems[index].name}" from this receipt?`)) return;
    updateReceiptItems(tx.id, tx.receiptItems.filter((_, i) => i !== index));
  };

  const handleApplyPriceFix = () => {
    updateReceiptItems(tx.id, priceFix);
    addToast('Multi-quantity prices corrected — items now match the amount paid');
  };

  const handleItemCategoryChange = (index, categoryId) => {
    updateReceiptItemCategory(tx.id, index, categoryId);
    addToast(`"${tx.receiptItems[index].name}" moved to ${getCategory(categoryId).name} — remembered for future scans`);
  };

  return (
    <div className="modal-overlay" onClick={() => setReceiptViewerTx(null)}>
      <div
        className="modal-content"
        style={{ maxWidth: '680px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
              <h2 className="modal-title" style={{ fontSize: '1.2rem' }}>
                {tx.description}
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {formatDate(tx.date)} • {allocations.length > 1 ? `${allocations.length} categories` : cat.name}
              </div>
            </div>
          </div>

          <button className="btn-icon" onClick={() => setReceiptViewerTx(null)}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Amount Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              padding: '1rem 1.25rem',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Amount Paid</div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--expense-red)'
                }}
              >
                {formatCurrency(tx.amount, currency.code, currency.symbol)}
              </div>
            </div>
          </div>

          {/* Spending split by category */}
          {allocations.length > 1 && (
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Counted on your dashboard as
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {allocations.map(({ categoryId, amount }) => {
                  const c = getCategory(categoryId);
                  return (
                    <span
                      key={categoryId}
                      className="badge-tag"
                      style={{ backgroundColor: `${c.color}15`, color: c.color, fontWeight: 600 }}
                    >
                      {c.name} · {formatCurrency(amount, currency.code, currency.symbol)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Itemized Breakdown if available */}
          {hasItems && (
            <div>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <ShoppingCart size={15} /> Itemized Breakdown ({tx.receiptItems.length} items)
              </div>

              {/* Do the lines add up to what was paid? */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.45rem',
                  fontSize: '0.8rem',
                  lineHeight: 1.45,
                  marginBottom: '0.6rem',
                  color: itemsTally ? 'var(--income-green)' : 'var(--warning-amber)'
                }}
              >
                {itemsTally ? <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> : <AlertCircle size={15} style={{ flexShrink: 0 }} />}
                <div>
                  {itemsTally ? (
                    <>Items match the amount paid ({money(tx.amount)}).</>
                  ) : (
                    <>
                      Items add up to {money(itemsTotal)}, {money(Math.abs(itemsDiff))}{' '}
                      {itemsDiff > 0 ? 'more' : 'less'} than the {money(tx.amount)} paid. Category amounts are
                      scaled to the amount paid; correct the lines below to make the split exact.
                      {priceFix && (
                        <div style={{ marginTop: '0.45rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                            onClick={handleApplyPriceFix}
                          >
                            <Wand2 size={13} />
                            <span>
                              Fix multi-quantity prices ({money(getItemsTotal(priceFix))})
                            </span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  maxHeight: '260px',
                  overflow: 'auto'
                }}
              >
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ width: '150px' }}>Category</th>
                      <th style={{ textAlign: 'center', width: '64px' }}>Qty</th>
                      <th style={{ textAlign: 'right', width: '96px' }}>Amount</th>
                      <th style={{ width: '36px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tx.receiptItems.map((item, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.name}</div>
                        </td>
                        <td>
                          <select
                            className="form-input"
                            style={{ padding: '0.3rem 0.45rem', fontSize: '0.8rem' }}
                            value={item.categoryId || tx.categoryId}
                            onChange={(e) => handleItemCategoryChange(i, e.target.value)}
                          >
                            {expenseCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            key={`qty-${item.qty}`}
                            type="number"
                            min="1"
                            step="1"
                            className="form-input"
                            style={{ padding: '0.3rem 0.4rem', fontSize: '0.8rem', textAlign: 'center', minWidth: '3.5rem' }}
                            defaultValue={item.qty || 1}
                            onBlur={(e) => handleLineChange(i, 'qty', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          />
                        </td>
                        <td>
                          <input
                            key={`amount-${lineAmount(item).toFixed(2)}`}
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ padding: '0.3rem 0.4rem', fontSize: '0.8rem', textAlign: 'right', fontWeight: 600, minWidth: '5rem' }}
                            defaultValue={lineAmount(item).toFixed(2)}
                            onBlur={(e) => handleLineChange(i, 'amount', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ width: '26px', height: '26px', color: 'var(--expense-red)' }}
                            title="Remove line"
                            onClick={() => handleDeleteLine(i)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tx.notes && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <strong>Notes: </strong> {tx.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
