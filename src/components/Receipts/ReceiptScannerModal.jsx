import React, { useState, useRef, useEffect } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import {
  resizeImageToBase64,
  readFileAsDataURL,
  parseReceiptWithGemini,
  checkReceiptDate,
  SCAN_TIMEOUT_MS
} from '../../utils/aiScanner';
import { getPrimaryCategoryId } from '../../utils/receiptCategories';
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
  AlertCircle,
  Brain
} from 'lucide-react';

// Gemini accepts inline files up to ~20MB per request
const MAX_PDF_BYTES = 15 * 1024 * 1024;

const stripScanFields = ({ suggestedCategoryId, learnedCategory, ...item }) => item;

export const ReceiptScannerModal = () => {
  const {
    isReceiptScannerOpen,
    setIsReceiptScannerOpen,
    categories,
    currency,
    geminiApiKey,
    addTransaction,
    addBatchTransactions,
    addToast,
    setSelectedMonth,
    setSelectedYear,
    applyItemCategoryMemory,
    rememberItemCategories
  } = useExpense();

  const fileInputRef = useRef(null);
  const scanAbortRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [scanSeconds, setScanSeconds] = useState(0);
  const [scanStatus, setScanStatus] = useState(null);

  useEffect(() => {
    if (!isScanning) return;
    setScanSeconds(0);
    setScanStatus(null);
    const interval = setInterval(() => setScanSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isScanning]);

  if (!isReceiptScannerOpen) return null;

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const dateCheck = scanResult ? checkReceiptDate(scanResult.date) : null;

  const formatReceiptDate = (iso) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  // Show the dashboard for the month the receipt was saved into
  const jumpToReceiptMonth = () => {
    const [y, m] = (scanResult.date || '').split('-');
    if (!y || !m) return;
    setSelectedYear(Number(y));
    setSelectedMonth(m);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    // Reset so picking the same photo again still triggers a new scan
    e.target.value = '';
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file) => {
    const controller = new AbortController();
    scanAbortRef.current = controller;
    try {
      setErrorMsg(null);
      setImagePreview(null);
      setPdfFile(null);

      if (!geminiApiKey || !geminiApiKey.trim()) {
        setErrorMsg('Add your Google Gemini API key in Settings to scan receipts.');
        return;
      }

      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (isPdf && file.size > MAX_PDF_BYTES) {
        setErrorMsg(`This PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_PDF_BYTES / 1024 / 1024} MB.`);
        return;
      }

      setIsScanning(true);

      let scanData;
      if (isPdf) {
        scanData = await readFileAsDataURL(file);
        setPdfFile({ name: file.name });
      } else {
        // Small copy for the on-screen preview, larger copy so the AI can read small print
        setImagePreview(await resizeImageToBase64(file));
        scanData = await resizeImageToBase64(file, 3072, 0.9);
      }

      const parsed = await parseReceiptWithGemini(scanData, geminiApiKey.trim(), categories, {
        signal: controller.signal,
        onStatus: setScanStatus,
        mimeType: isPdf ? 'application/pdf' : 'image/jpeg'
      });
      if (!parsed || !Array.isArray(parsed.items)) {
        console.error('Unexpected Gemini response:', parsed);
        throw new Error('AI returned an unexpected response format');
      }

      // Clean up item values, then override AI categories with ones the user taught us
      const validCategoryIds = new Set(expenseCategories.map((c) => c.id));
      const fallbackCategoryId = validCategoryIds.has('cat_other_exp')
        ? 'cat_other_exp'
        : expenseCategories[0]?.id;
      const items = applyItemCategoryMemory(
        parsed.items.map((it) => ({
          name: String(it.name || '').trim() || 'Item',
          qty: Number(it.qty) > 0 ? Number(it.qty) : 1,
          price: Number(it.price) || 0,
          categoryId: validCategoryIds.has(it.categoryId) ? it.categoryId : fallbackCategoryId
        }))
      ).map((it) => ({ ...it, suggestedCategoryId: it.categoryId }));

      const learnedCount = items.filter((it) => it.learnedCategory).length;
      if (learnedCount > 0) {
        addToast(`Applied your saved category for ${learnedCount} item${learnedCount > 1 ? 's' : ''}`, 'info');
      }

      setScanResult({
        ...parsed,
        items,
        tax: Number(parsed.tax) || 0,
        total: Number(parsed.total) || 0
      });
      setIsScanning(false);
      addToast('Receipt analyzed successfully!');
    } catch (err) {
      if (controller.signal.aborted) {
        setIsScanning(false);
        return;
      }
      console.error(err);
      const reason = err?.message ? `: ${err.message.replace(/\.+$/, '')}` : '';
      setErrorMsg(`Failed to analyze receipt${reason}. Please try again.`);
      setIsScanning(false);
    } finally {
      if (scanAbortRef.current === controller) scanAbortRef.current = null;
    }
  };

  const handleCancelScan = () => {
    scanAbortRef.current?.abort();
    setIsScanning(false);
    setImagePreview(null);
    setPdfFile(null);
  };

  // Saves category corrections for next time and returns items without scan-only fields
  const finalizeItems = () => {
    const corrections = scanResult.items.filter((it) => it.categoryId !== it.suggestedCategoryId);
    rememberItemCategories(corrections);
    return scanResult.items.map(stripScanFields);
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

    const items = finalizeItems();
    // Headline category is the one with the biggest share; the dashboard still
    // counts every item under its own category
    const primaryCat = getPrimaryCategoryId(items, expenseCategories[0]?.id || 'cat_groceries');
    const itemsSummary = items
      .map((it) => `${it.qty > 1 ? `${it.qty}x ` : ''}${it.name} (${currency.symbol}${it.price})`)
      .join(', ');

    addTransaction({
      type: 'expense',
      amount: scanResult.total,
      categoryId: primaryCat,
      date: scanResult.date,
      paymentMethod: scanResult.paymentMethod || 'credit_card',
      description: scanResult.merchant || 'Receipt Expense',
      notes: `Receipt with ${items.length} items: ${itemsSummary.slice(0, 100)}...`,
      receiptItems: items,
      tax: scanResult.tax
    });

    jumpToReceiptMonth();
    handleClose();
  };

  // Save Option 2: Split and log individual line items as separate categorized transactions
  const handleSaveAsSplit = () => {
    if (!scanResult || !scanResult.items.length) return;

    const txList = finalizeItems().map((it) => ({
      type: 'expense',
      amount: it.price * (it.qty || 1),
      categoryId: it.categoryId,
      date: scanResult.date,
      paymentMethod: scanResult.paymentMethod || 'credit_card',
      description: `${scanResult.merchant}: ${it.name}`,
      notes: `Itemized from receipt (Qty: ${it.qty || 1})`
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
        notes: 'Extracted tax from receipt'
      });
    }

    addBatchTransactions(
      txList,
      `Logged ${txList.length} split expenses on ${formatReceiptDate(scanResult.date)}`
    );
    jumpToReceiptMonth();
    handleClose();
  };

  const handleClose = () => {
    scanAbortRef.current?.abort();
    setIsReceiptScannerOpen(false);
    setImagePreview(null);
    setPdfFile(null);
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
                Upload a receipt photo or PDF to auto-detect store, date, itemized prices, and categories
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
                accept="image/*,application/pdf,.pdf"
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
                Upload a Receipt Photo or PDF
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Supports JPG, PNG, WEBP photos and PDF e-receipts. AI will extract items, prices, tax, and categories.
              </p>
            </div>

            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--expense-red-glow)',
                  color: 'var(--expense-red)',
                  fontSize: '0.85rem'
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '100%', padding: '0.75rem' }}>
                  <FileText size={48} color="var(--text-subtle)" />
                  {pdfFile && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                      {pdfFile.name}
                    </span>
                  )}
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
                {scanStatus || 'Detecting items, prices, subtotal, tax, and categorizing...'}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '0.5rem' }}>
                {scanSeconds}s elapsed · times out after {SCAN_TIMEOUT_MS / 1000}s
              </p>
            </div>
            <button className="btn btn-secondary" onClick={handleCancelScan}>
              <X size={16} />
              <span>Cancel Scan</span>
            </button>
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
                  style={dateCheck ? { borderColor: 'var(--warning-amber)' } : undefined}
                />
                {dateCheck && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--warning-amber)', marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={14} />
                    <span>{dateCheck.warning}</span>
                    {dateCheck.suggestion && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                        onClick={() => setScanResult({ ...scanResult, date: dateCheck.suggestion })}
                      >
                        Use {formatReceiptDate(dateCheck.suggestion)}
                      </button>
                    )}
                  </div>
                )}
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
                <div>
                  <label className="form-label" style={{ margin: 0 }}>
                    Itemized Cost Breakdown ({scanResult.items.length} items)
                  </label>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Each item counts toward its own category on the dashboard. Category changes are remembered for next time.
                  </div>
                </div>
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
                      <th style={{ width: '80px' }}>Qty</th>
                      <th style={{ width: '105px' }}>Price</th>
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
                          {item.learnedCategory && item.categoryId === item.suggestedCategoryId && (
                            <div
                              style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              title="Category applied from your earlier correction"
                            >
                              <Brain size={11} />
                              <span>Remembered</span>
                            </div>
                          )}
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
                  setPdfFile(null);
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
