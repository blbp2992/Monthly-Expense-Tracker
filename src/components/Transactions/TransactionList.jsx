import React from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PAYMENT_METHODS } from '../../data/initialData';
import { CategoryIcon } from '../UI/CategoryIcon';
import { TransactionFilter } from './TransactionFilter';
import {
  Receipt,
  Edit2,
  Trash2,
  Copy,
  Plus,
  Sparkles,
  Paperclip,
  FileSpreadsheet,
  Download,
  FileText
} from 'lucide-react';
import { exportTransactionsAsCSV, exportTransactionsAsExcel } from '../../utils/storage';

export const TransactionList = () => {
  const {
    filteredTransactions,
    currentMonthTransactions,
    transactions,
    categories,
    currency,
    selectedMonth,
    selectedYear,
    setEditingTx,
    setIsTxModalOpen,
    setIsFileImportOpen,
    setReceiptViewerTx,
    deleteTransaction,
    duplicateTransaction,
    addToast
  } = useExpense();

  const getCategory = (catId) => {
    return (
      categories.find((c) => c.id === catId) || {
        name: 'Uncategorized',
        color: '#64748b',
        icon: 'CircleDollarSign'
      }
    );
  };

  const getPaymentMethodName = (methodId) => {
    const pm = PAYMENT_METHODS.find((p) => p.id === methodId);
    return pm ? pm.name : methodId || 'Standard';
  };

  const handleEdit = (tx) => {
    setEditingTx(tx);
    setIsTxModalOpen(true);
  };

  const handleDelete = (tx) => {
    if (window.confirm(`Are you sure you want to delete "${tx.description}"?`)) {
      deleteTransaction(tx.id);
    }
  };

  const handleExportCSV = () => {
    const txToExport = filteredTransactions.length > 0 ? filteredTransactions : currentMonthTransactions;
    if (txToExport.length === 0) {
      addToast('No transactions to export for this view', 'info');
      return;
    }
    const filename = `expanses_${selectedYear}_${selectedMonth}_transactions.csv`;
    exportTransactionsAsCSV(txToExport, categories, filename);
    addToast(`Exported ${txToExport.length} transactions to CSV`);
  };

  const handleExportExcel = () => {
    const txToExport = filteredTransactions.length > 0 ? filteredTransactions : currentMonthTransactions;
    if (txToExport.length === 0) {
      addToast('No transactions to export for this view', 'info');
      return;
    }
    const filename = `expanses_${selectedYear}_${selectedMonth}_transactions.xlsx`;
    exportTransactionsAsExcel(txToExport, categories, filename);
    addToast(`Exported ${txToExport.length} transactions to Excel (.xlsx)`);
  };

  return (
    <div className="glass-panel">
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="panel-title">
          <Receipt size={20} color="var(--primary)" />
          <span>Transactions History</span>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              background: 'var(--bg-input)',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)'
            }}
          >
            {filteredTransactions.length} entries
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Export Dropdown / Action Buttons */}
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.42rem 0.75rem' }}
            title="Export current filtered view to Excel spreadsheet (.xlsx)"
            onClick={handleExportExcel}
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>

          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.42rem 0.75rem' }}
            title="Export current filtered view to CSV file (.csv)"
            onClick={handleExportCSV}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* Import File Button */}
          <button
            className="btn btn-secondary"
            style={{
              fontSize: '0.82rem',
              padding: '0.42rem 0.75rem',
              borderColor: 'hsla(158, 79%, 42%, 0.4)',
              background: 'hsla(158, 79%, 42%, 0.08)'
            }}
            title="Import transactions from CSV or Excel file"
            onClick={() => setIsFileImportOpen(true)}
          >
            <FileSpreadsheet size={15} color="var(--income-green)" />
            <span>Import File</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
            onClick={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
          >
            <Plus size={15} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      <TransactionFilter />

      {filteredTransactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Receipt size={28} />
          </div>
          <h3>No transactions found</h3>
          <p>Try clearing filters, add a new transaction, or import a CSV/Excel file.</p>
          <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setIsFileImportOpen(true)}
            >
              <FileSpreadsheet size={16} color="var(--income-green)" />
              <span>Import CSV / Excel</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingTx(null);
                setIsTxModalOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Category</th>
                <th>Payment Method</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const cat = getCategory(tx.categoryId);
                const isIncome = tx.type === 'income';
                const hasReceipt = Boolean(tx.receiptImage || (tx.receiptItems && tx.receiptItems.length > 0));

                return (
                  <tr key={tx.id}>
                    {/* Description & Note */}
                    <td>
                      <div className="tx-desc-cell">
                        <div
                          className="tx-icon-bubble"
                          style={{
                            backgroundColor: `${cat.color}18`,
                            color: cat.color
                          }}
                        >
                          <CategoryIcon name={cat.icon} size={18} color={cat.color} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="tx-desc-text">{tx.description}</span>
                            {hasReceipt && (
                              <button
                                type="button"
                                className="badge-tag"
                                style={{
                                  background: 'hsla(239, 84%, 67%, 0.15)',
                                  color: 'var(--primary)',
                                  border: '1px solid var(--border-highlight)',
                                  cursor: 'pointer',
                                  padding: '0.15rem 0.45rem'
                                }}
                                title="Click to view attached receipt & item breakdown"
                                onClick={() => setReceiptViewerTx(tx)}
                              >
                                <Paperclip size={11} />
                                <span>Receipt</span>
                              </button>
                            )}
                          </div>
                          {tx.notes && <div className="tx-date-sub">{tx.notes}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span
                        className="badge-tag"
                        style={{
                          backgroundColor: `${cat.color}15`,
                          color: cat.color,
                          fontWeight: 600
                        }}
                      >
                        {cat.name}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {getPaymentMethodName(tx.paymentMethod)}
                      </span>
                    </td>

                    {/* Date */}
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{formatDate(tx.date)}</span>
                    </td>

                    {/* Amount */}
                    <td style={{ textAlign: 'right' }}>
                      <span className={`tx-amount ${isIncome ? 'income' : 'expense'}`}>
                        {isIncome ? '+' : '-'}
                        {formatCurrency(tx.amount, currency.code, currency.symbol)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        {hasReceipt && (
                          <button
                            className="btn-icon"
                            style={{ width: '32px', height: '32px', color: 'var(--primary)' }}
                            title="View Receipt & Item Breakdown"
                            onClick={() => setReceiptViewerTx(tx)}
                          >
                            <Paperclip size={14} />
                          </button>
                        )}
                        <button
                          className="btn-icon"
                          style={{ width: '32px', height: '32px' }}
                          title="Duplicate"
                          onClick={() => duplicateTransaction(tx.id)}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ width: '32px', height: '32px' }}
                          title="Edit"
                          onClick={() => handleEdit(tx)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ width: '32px', height: '32px', color: 'var(--expense-red)' }}
                          title="Delete"
                          onClick={() => handleDelete(tx)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
