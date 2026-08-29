import React, { useState, useRef } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import {
  resizeImageToBase64,
  parseReceiptWithGemini,
  parseReceiptSmartFallback,
  DEMO_RECEIPTS
} from '../../utils/aiScanner';
import { formatCurrency } from '../../utils/formatters';
import { PAYMENT_METHODS } from '../../data/initialData';
import {
  Sparkles,
  UploadCloud,
  FileText,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Split,
  Layers,
  Camera,
  AlertCircle
} from 'lucide-react';

export const ReceiptScannerModal = () => {
  const {
    isReceiptScannerOpen,
    setIsReceiptScannerOpen,
    categories,
    currency,
    geminiApiKey,
    addTransaction,
    addBatchTransactions,
    addToast
  } = useExpense();

  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isReceiptScannerOpen) return null;

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file) => {
    try {
      setIsScanning(true);
      setErrorMsg(null);
      const base64 = await resizeImageToBase64(file);
      setImagePreview(base64);

      let parsed;
      if (geminiApiKey && geminiApiKey.trim()) {
        try {
          parsed = await parseReceiptWithGemini(base64, geminiApiKey.trim(), categories);
        } catch (apiErr) {
          console.warn('Gemini API call failed, falling back to smart parser:', apiErr);
          addToast('Gemini API failed, using smart parser fallback', 'info');
          parsed = await parseReceiptSmartFallback(base64, file.name, categories);
        }
      } else {
        parsed = await parseReceiptSmartFallback(base64, file.name, categories);
      }

      setScanResult(parsed);
      setIsScanning(false);
      addToast('Receipt analyzed successfully!');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to analyze receipt. Please try another image.');
      setIsScanning(false);
    }
  };

  const handleLoadDemo = async (demoKey) => {
    setIsScanning(true);
    setErrorMsg(null);
    setImagePreview('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" fill="%231e293b"><rect width="300" height="400" rx="10"/><text x="50%" y="45%" fill="%2394a3b8" font-family="sans-serif" font-size="16" text-anchor="middle">Sample Receipt</text><text x="50%" y="55%" fill="%236366f1" font-family="sans-serif" font-size="14" text-anchor="middle">AI Scanned Document</text></svg>');

    const sample = DEMO_RECEIPTS.find((d) => d.id === demoKey) || DEMO_RECEIPTS[0];
    await new Promise((r) => setTimeout(r, 1000));

    setScanResult({
      merchant: sample.merchant,
      date: sample.date,
      paymentMethod: sample.paymentMethod,
      tax: sample.tax,
      total: sample.total,
      items: sample.items.map((i) => ({ ...i }))
    });
    setIsScanning(false);
    addToast(`Loaded ${sample.title}`);
  };

  // Editable item handlers
  const handleItemChange = (index, field, value) => {
    setScanResult((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: field === 'price' || field === 'qty' ? parseFloat(value) || 0 : value
      };

      // Recalculate total
      const newTotal = updatedItems.reduce(
        (acc, it) => acc + (it.price * (it.qty || 1)),
        prev.tax || 0
      );

      return {
        ...prev,
        items: updatedItems,
        total: parseFloat(newTotal.toFixed(2))
      };
    });
  };

  const handleAddItem = () => {
    const defaultCat = expenseCategories[0]?.id || 'cat_groceries';
    setScanResult((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { name: 'New Item', qty: 1, price: 0, categoryId: defaultCat }
      ]
    }));
  };

  const handleDeleteItem = (index) => {
    setScanResult((prev) => {
      const updatedItems = prev.items.filter((_, i) => i !== index);
      const newTotal = updatedItems.reduce(
        (acc, it) => acc + (it.price * (it.qty || 1)),
        prev.tax || 0
      );
      return {
        ...prev,
        items: updatedItems,
        total: parseFloat(newTotal.toFixed(2))
      };
    });
  };

  // Save Option 1: Single combined transaction with receipt & items attached
  const handleSaveAsSingle = () => {
    if (!scanResult) return;

    // Pick dominant category or category of first item
    const dominantCat = scanResult.items[0]?.categoryId || 'cat_groceries';
    const itemsSummary = scanResult.items
      .map((it) => `${it.qty > 1 ? `${it.qty}x ` : ''}${it.name} (${currency.symbol}${it.price})`)
      .join(', ');

    addTransaction({
      type: 'expense',
      amount: scanResult.total,
      categoryId: dominantCat,
      date: scanResult.date,
      paymentMethod: scanResult.paymentMethod || 'credit_card',
      description: scanResult.merchant || 'Receipt Expense',
      notes: `Receipt with ${scanResult.items.length} items: ${itemsSummary.slice(0, 100)}...`,
      receiptImage: imagePreview,
      receiptItems: scanResult.items,
      tax: scanResult.tax
    });

    handleClose();
  };

  // Save Option 2: Split and log individual line items as separate categorized transactions
  const handleSaveAsSplit = () => {
    if (!scanResult || !scanResult.items.length) return;

    const txList = scanResult.items.map((it) => ({
      type: 'expense',
      amount: it.price * (it.qty || 1),
      categoryId: it.categoryId,
      date: scanResult.date,
      paymentMethod: scanResult.paymentMethod || 'credit_card',
      description: `${scanResult.merchant}: ${it.name}`,
      notes: `Itemized from receipt (Qty: ${it.qty || 1})`,
      receiptImage: imagePreview
    }));

    // If there is a tax item, log it if > 0
    if (scanResult.tax > 0) {
      txList.push({
        type: 'expense',
        amount: scanResult.tax,
        categoryId: 'cat_other_exp',
        date: scanResult.date,
        paymentMethod: scanResult.paymentMethod || 'credit_card',
        description: `${scanResult.merchant} (Tax & Fees)`,
        notes: 'Extracted tax from receipt',
        receiptImage: imagePreview
      });
    }

    addBatchTransactions(txList, `Logged ${txList.length} split categorized expenses!`);
    handleClose();
  };

  const handleClose = () => {
    setIsReceiptScannerOpen(false);
    setImagePreview(null);
    setScanResult(null);
    setIsScanning(false);
    setErrorMsg(null);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '820px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>
                AI Receipt Scanner & Item Breakdown
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Upload any receipt image to auto-detect store, date, itemized prices, and categories
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Scanner Body */}
        {!scanResult && !isScanning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Upload Zone */}
            <div
              style={{
                border: '2px dashed var(--border-highlight)',
                borderRadius: 'var(--radius-lg)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: 'var(--bg-input)',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--primary-glow)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}
              >
                <UploadCloud size={28} />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>
                Upload or Take a Photo of Receipt
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Supports JPG, PNG, WEBP. AI will extract items, prices, tax, and categories.
              </p>
            </div>

            {/* Quick Demo Receipts */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                Or test instantly with sample receipts:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {DEMO_RECEIPTS.map((demo) => (
                  <button
                    key={demo.id}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', justifyContent: 'flex-start', padding: '0.65rem 0.85rem' }}
                    onClick={() => handleLoadDemo(demo.id)}
                  >
                    <FileText size={15} color="var(--primary)" />
                    <span>{demo.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scanning Laser Animation */}
        {isScanning && (
          <div
            style={{
              padding: '3rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.25rem',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '180px',
                height: '220px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-card)'
              }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Scanning Receipt"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <FileText size={48} color="var(--text-subtle)" />
                </div>
              )}
              {/* Laser Line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, transparent, #6366f1, #06b6d4, transparent)',
                  boxShadow: '0 0 12px #6366f1',
                  animation: 'laserScan 1.6s infinite ease-in-out'
                }}
              />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Analyzing Receipt with AI...</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Detecting items, prices, subtotal, tax, and categorizing...
              </p>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {scanResult && !isScanning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Meta Fields */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Merchant / Store</label>
                <input
                  type="text"
                  className="form-input"
                  value={scanResult.merchant || ''}
                  onChange={(e) => setScanResult({ ...scanResult, merchant: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={scanResult.date || ''}
                  onChange={(e) => setScanResult({ ...scanResult, date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment Channel</label>
                <select
                  className="form-input"
                  value={scanResult.paymentMethod || 'credit_card'}
                  onChange={(e) => setScanResult({ ...scanResult, paymentMethod: e.target.value })}
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tax / Surcharge ({currency.symbol})</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={scanResult.tax || 0}
                  onChange={(e) => {
                    const taxVal = parseFloat(e.target.value) || 0;
                    const itemsSum = scanResult.items.reduce(
                      (acc, it) => acc + (it.price * (it.qty || 1)),
                      0
                    );
                    setScanResult({
                      ...scanResult,
                      tax: taxVal,
                      total: parseFloat((itemsSum + taxVal).toFixed(2))
                    });
                  }}
                />
              </div>
            </div>

            {/* Itemized Lines Table */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.6rem'
                }}
              >
                <label className="form-label" style={{ margin: 0 }}>
                  Itemized Cost Breakdown ({scanResult.items.length} items)
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                  onClick={handleAddItem}
                >
                  <Plus size={13} />
                  <span>Add Line</span>
                </button>
              </div>

              <div
                style={{
                  maxHeight: '230px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ width: '65px' }}>Qty</th>
                      <th style={{ width: '90px' }}>Price</th>
                      <th style={{ width: '150px' }}>Category</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                            value={item.qty || 1}
                            onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                            value={item.price}
                            onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                            value={item.categoryId}
                            onChange={(e) => handleItemChange(idx, 'categoryId', e.target.value)}
                          >
                            {expenseCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ width: '28px', height: '28px', color: 'var(--expense-red)' }}
                            onClick={() => handleDeleteItem(idx)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Display */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Total (Items + Tax):
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    color: 'var(--expense-red)'
                  }}
                >
                  {formatCurrency(scanResult.total, currency.code, currency.symbol)}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.82rem' }}
                onClick={() => {
                  setScanResult(null);
                  setImagePreview(null);
                }}
              >
                Scan Another
              </button>
            </div>

            {/* Save Actions */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.85rem',
                marginTop: '0.25rem'
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '0.75rem' }}
                onClick={handleSaveAsSingle}
              >
                <CheckCircle2 size={16} />
                <span>Log Total ({formatCurrency(scanResult.total, currency.code, currency.symbol)})</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.75rem' }}
                onClick={handleSaveAsSplit}
                title="Creates separate individual transactions for each item categorized accordingly"
              >
                <Split size={16} color="var(--primary)" />
                <span>Split into {scanResult.items.length} Separate Expenses</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
