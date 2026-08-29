import React from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CategoryIcon } from '../UI/CategoryIcon';
import { X, Receipt, ShoppingCart, Download } from 'lucide-react';

export const ReceiptViewerModal = () => {
  const { receiptViewerTx, setReceiptViewerTx, categories, currency } = useExpense();

  if (!receiptViewerTx) return null;

  const tx = receiptViewerTx;
  const cat = categories.find((c) => c.id === tx.categoryId) || {
    name: 'Expense',
    color: '#6366f1',
    icon: 'Receipt'
  };

  const hasItems = tx.receiptItems && tx.receiptItems.length > 0;

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
                {formatDate(tx.date)} • {cat.name}
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

            {tx.receiptImage && (
              <a
                href={tx.receiptImage}
                download={`receipt_${tx.id}.jpg`}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
              >
                <Download size={14} />
                <span>Save Image</span>
              </a>
            )}
          </div>

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

              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: 'center', width: '50px' }}>Qty</th>
                      <th style={{ textAlign: 'right', width: '90px' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tx.receiptItems.map((item, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.name}</div>
                          {item.categoryId && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {categories.find((c) => c.id === item.categoryId)?.name || ''}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.qty || 1}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(item.price * (item.qty || 1), currency.code, currency.symbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attached Receipt Image */}
          {tx.receiptImage && (
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Receipt Photo
              </div>
              <div
                style={{
                  maxHeight: '300px',
                  overflow: 'auto',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: '#000',
                  textAlign: 'center',
                  padding: '0.5rem'
                }}
              >
                <img
                  src={tx.receiptImage}
                  alt="Receipt"
                  style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain' }}
                />
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
