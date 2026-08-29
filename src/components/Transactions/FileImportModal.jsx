import React, { useState, useRef, useEffect } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import {
  parseRawFile,
  extractHeaderAndRows,
  autoDetectColumns,
  mapRowsToTransactions,
  downloadSampleCSV,
  downloadSampleExcel
} from '../../utils/fileImporter';
import { PAYMENT_METHODS } from '../../data/initialData';
import { formatCurrency } from '../../utils/formatters';
import { CategoryIcon } from '../UI/CategoryIcon';
import {
  FileSpreadsheet,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Download,
  Check,
  Trash2,
  Sparkles,
  HelpCircle,
  Calendar,
  Layers,
  ArrowUpDown,
  Filter
} from 'lucide-react';

export const FileImportModal = () => {
  const {
    isFileImportOpen,
    setIsFileImportOpen,
    categories,
    transactions,
    importTransactionsFromFile,
    currency
  } = useExpense();

  // Wizard Step: 'upload' | 'mapping' | 'preview'
  const [currentStep, setCurrentStep] = useState('upload');

  // File state
  const [fileData, setFileData] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Headers and raw rows
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);

  // Column Mapping
  const [mapping, setMapping] = useState({
    date: '',
    description: '',
    amountMode: 'single', // 'single' | 'split'
    amount: '',
    debit: '',
    credit: '',
    category: '',
    paymentMethod: '',
    type: '',
    notes: ''
  });

  // Import configuration
  const [defaultCategory, setDefaultCategory] = useState('');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('credit_card');
  const [signInterpretation, setSignInterpretation] = useState('positive_is_expense');
  const [jumpToImportedMonth, setJumpToImportedMonth] = useState(true);

  // Parsed Transaction Previews
  const [previewRows, setPreviewRows] = useState([]);
  const [previewFilter, setPreviewFilter] = useState('all'); // 'all' | 'valid' | 'issues'

  const fileInputRef = useRef(null);

  // Set default category when categories are loaded
  useEffect(() => {
    if (categories && categories.length > 0 && !defaultCategory) {
      const groceryCat = categories.find((c) => c.id === 'cat_groceries');
      setDefaultCategory(groceryCat ? groceryCat.id : categories[0].id);
    }
  }, [categories, defaultCategory]);

  // Reset modal when opened/closed
  useEffect(() => {
    if (isFileImportOpen) {
      setCurrentStep('upload');
      setFileData(null);
      setSelectedSheet('');
      setErrorMessage('');
      setPreviewRows([]);
    }
  }, [isFileImportOpen]);

  if (!isFileImportOpen) return null;

  // Handle file selection
  const handleFileProcess = async (file) => {
    if (!file) return;
    setIsLoading(true);
    setErrorMessage('');

    try {
      const parsed = await parseRawFile(file);
      setFileData(parsed);

      const firstSheet = parsed.sheets[0];
      setSelectedSheet(firstSheet);

      const { headers, rows } = extractHeaderAndRows(parsed.sheetsData[firstSheet] || []);
      setRawHeaders(headers);
      setRawRows(rows);

      // Auto-detect columns
      const detected = autoDetectColumns(headers);
      setMapping(detected);

      setCurrentStep('mapping');
    } catch (err) {
      console.error('File parse error:', err);
      setErrorMessage(err.message || 'Failed to parse file. Please check file format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName);
    if (fileData && fileData.sheetsData[sheetName]) {
      const { headers, rows } = extractHeaderAndRows(fileData.sheetsData[sheetName]);
      setRawHeaders(headers);
      setRawRows(rows);
      const detected = autoDetectColumns(headers);
      setMapping(detected);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  // Move from Mapping to Preview
  const handleProceedToPreview = () => {
    if (!mapping.date) {
      setErrorMessage('Please map the Date column.');
      return;
    }
    if (mapping.amountMode === 'single' && !mapping.amount) {
      setErrorMessage('Please map the Amount column.');
      return;
    }
    if (mapping.amountMode === 'split' && !mapping.debit && !mapping.credit) {
      setErrorMessage('Please map at least Debit or Credit column for split amounts.');
      return;
    }

    setErrorMessage('');
    const mapped = mapRowsToTransactions({
      rows: rawRows,
      mapping,
      categories,
      defaultCategory,
      defaultPaymentMethod,
      signInterpretation,
      existingTransactions: transactions
    });

    setPreviewRows(mapped);
    setCurrentStep('preview');
  };

  // Toggle single row selection in preview
  const handleToggleRowSelect = (tempId) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, selected: !r.selected } : r))
    );
  };

  // Toggle all rows selection
  const handleToggleSelectAll = () => {
    const areAllSelected = previewRows.every((r) => r.selected);
    setPreviewRows((prev) => prev.map((r) => ({ ...r, selected: !areAllSelected })));
  };

  // Inline edit row fields in preview
  const handleUpdatePreviewRow = (tempId, field, value) => {
    setPreviewRows((prev) =>
      prev.map((r) => {
        if (r.tempId !== tempId) return r;
        const updated = { ...r, [field]: value };
        if (field === 'amount') {
          updated.amount = parseFloat(value) || 0;
        }
        updated.isValid = Boolean(updated.date && updated.amount > 0 && updated.description);
        return updated;
      })
    );
  };

  // Remove row from preview
  const handleDeletePreviewRow = (tempId) => {
    setPreviewRows((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  // Execute Final Import
  const handleConfirmImport = () => {
    const selectedTransactions = previewRows.filter((r) => r.selected && r.isValid);
    if (selectedTransactions.length === 0) {
      setErrorMessage('No valid transactions selected for import.');
      return;
    }

    importTransactionsFromFile(selectedTransactions, jumpToImportedMonth);
    setIsFileImportOpen(false);
  };

  // Derived Preview Metrics
  const selectedCount = previewRows.filter((r) => r.selected && r.isValid).length;
  const invalidCount = previewRows.filter((r) => !r.isValid).length;
  const duplicateCount = previewRows.filter((r) => r.isDuplicate).length;

  const totalExpenseSum = previewRows
    .filter((r) => r.selected && r.isValid && r.type === 'expense')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalIncomeSum = previewRows
    .filter((r) => r.selected && r.isValid && r.type === 'income')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Unique months detected in preview
  const detectedMonths = Array.from(
    new Set(
      previewRows
        .filter((r) => r.date)
        .map((r) => r.date.slice(0, 7))
    )
  ).sort();

  const filteredPreviewRows = previewRows.filter((row) => {
    if (previewFilter === 'valid') return row.isValid && !row.isDuplicate;
    if (previewFilter === 'issues') return !row.isValid || row.isDuplicate;
    return true;
  });

  return (
    <div className="modal-overlay" onClick={() => setIsFileImportOpen(false)}>
      <div
        className="modal-content file-import-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: currentStep === 'preview' ? '1060px' : '760px', width: '95%' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, hsla(158, 79%, 42%, 0.15) 0%, hsla(239, 84%, 67%, 0.15) 100%)',
                color: 'var(--income-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="modal-title">Import Transactions (CSV / Excel)</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Upload .csv, .xlsx or .xls spreadsheets with auto column mapping & live preview
              </div>
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={() => setIsFileImportOpen(false)}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Step Indicator */}
        <div className="import-wizard-steps">
          <div className={`wizard-step-item ${currentStep === 'upload' ? 'active' : 'completed'}`}>
            <span className="step-num">{currentStep !== 'upload' ? <Check size={12} /> : '1'}</span>
            <span className="step-label">Upload File</span>
          </div>
          <div className="wizard-step-line" />
          <div
            className={`wizard-step-item ${
              currentStep === 'mapping' ? 'active' : currentStep === 'preview' ? 'completed' : ''
            }`}
          >
            <span className="step-num">{currentStep === 'preview' ? <Check size={12} /> : '2'}</span>
            <span className="step-label">Map Columns</span>
          </div>
          <div className="wizard-step-line" />
          <div className={`wizard-step-item ${currentStep === 'preview' ? 'active' : ''}`}>
            <span className="step-num">3</span>
            <span className="step-label">Review & Import</span>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="import-error-banner">
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD & TEMPLATES */}
        {currentStep === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Drag & Drop Box */}
            <div
              className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, .tsv, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />

              <div className="drop-zone-icon">
                <UploadCloud size={36} />
              </div>

              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>
                {isLoading ? 'Reading file...' : 'Choose or drop your CSV or Excel file here'}
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
                Supports standard bank statements, credit card exports, or custom sheets (.xlsx, .xls, .csv, .tsv)
              </p>

              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: '0.5rem', pointerEvents: 'none' }}
              >
                Browse Files
              </button>
            </div>

            {/* Template Download Section */}
            <div className="template-download-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={18} color="var(--primary)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Need a starting layout?</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Download our ready-made template with sample expenses prefilled.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  onClick={downloadSampleExcel}
                >
                  <Download size={14} />
                  <span>Sample Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  onClick={downloadSampleCSV}
                >
                  <Download size={14} />
                  <span>Sample CSV (.csv)</span>
                </button>
              </div>
            </div>

            {/* Supported Columns Guide */}
            <div className="column-guide-card">
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Supported Column Headers (Auto-Detected):
              </div>
              <div className="tags-flex">
                <span className="info-tag">Date</span>
                <span className="info-tag">Description / Payee</span>
                <span className="info-tag">Amount (or Debit / Credit)</span>
                <span className="info-tag">Category</span>
                <span className="info-tag">Type (Expense/Income)</span>
                <span className="info-tag">Payment Method</span>
                <span className="info-tag">Notes</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: COLUMN MAPPING & CONFIGURATION */}
        {currentStep === 'mapping' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* File info summary */}
            <div className="file-summary-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="var(--primary)" />
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{fileData?.fileName}</span>
                <span className="badge-tag" style={{ background: 'var(--bg-input)' }}>
                  {rawRows.length} rows found
                </span>
              </div>

              {/* Multi-sheet selector for Excel */}
              {fileData?.sheets && fileData.sheets.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sheet:</span>
                  <select
                    className="select-field"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', width: 'auto' }}
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                  >
                    {fileData.sheets.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Column Mapping Grid */}
            <div className="mapping-section-container">
              <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Match Columns with File Headers:
              </div>

              <div className="mapping-grid">
                {/* Date Mapping */}
                <div className="mapping-item">
                  <label className="form-label required">
                    Date Column <span style={{ color: 'var(--expense-red)' }}>*</span>
                  </label>
                  <select
                    className="select-field"
                    value={mapping.date}
                    onChange={(e) => setMapping({ ...mapping, date: e.target.value })}
                  >
                    <option value="">-- Select Column --</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h} {rawRows[0] && rawRows[0][h] ? `(e.g. "${rawRows[0][h]}")` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description Mapping */}
                <div className="mapping-item">
                  <label className="form-label required">
                    Description / Payee <span style={{ color: 'var(--expense-red)' }}>*</span>
                  </label>
                  <select
                    className="select-field"
                    value={mapping.description}
                    onChange={(e) => setMapping({ ...mapping, description: e.target.value })}
                  >
                    <option value="">-- Select Column --</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h} {rawRows[0] && rawRows[0][h] ? `(e.g. "${rawRows[0][h]}")` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount Mode Toggle */}
                <div className="mapping-item" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Amount Column Structure
                    </label>
                    <div className="type-toggle-group" style={{ maxWidth: '320px' }}>
                      <button
                        type="button"
                        className={`type-toggle-btn ${mapping.amountMode === 'single' ? 'active-expense' : ''}`}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                        onClick={() => setMapping({ ...mapping, amountMode: 'single' })}
                      >
                        Single Amount Column
                      </button>
                      <button
                        type="button"
                        className={`type-toggle-btn ${mapping.amountMode === 'split' ? 'active-expense' : ''}`}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                        onClick={() => setMapping({ ...mapping, amountMode: 'split' })}
                      >
                        Split Debit / Credit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Single Amount Column */}
                {mapping.amountMode === 'single' ? (
                  <>
                    <div className="mapping-item">
                      <label className="form-label required">
                        Amount Column <span style={{ color: 'var(--expense-red)' }}>*</span>
                      </label>
                      <select
                        className="select-field"
                        value={mapping.amount}
                        onChange={(e) => setMapping({ ...mapping, amount: e.target.value })}
                      >
                        <option value="">-- Select Column --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h} {rawRows[0] && rawRows[0][h] ? `(e.g. "${rawRows[0][h]}")` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mapping-item">
                      <label className="form-label">Amount Sign Interpretation</label>
                      <select
                        className="select-field"
                        value={signInterpretation}
                        onChange={(e) => setSignInterpretation(e.target.value)}
                      >
                        <option value="negative_is_expense">Bank Statement (Negative = Expense, Positive = Income)</option>
                        <option value="positive_is_expense">Expense Tracker (All Positive = Expense)</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Split Debit / Credit columns */}
                    <div className="mapping-item">
                      <label className="form-label">
                        Debit Column (Money Out / Expense)
                      </label>
                      <select
                        className="select-field"
                        value={mapping.debit}
                        onChange={(e) => setMapping({ ...mapping, debit: e.target.value })}
                      >
                        <option value="">-- Select Column --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h} {rawRows[0] && rawRows[0][h] ? `(e.g. "${rawRows[0][h]}")` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mapping-item">
                      <label className="form-label">
                        Credit Column (Money In / Income)
                      </label>
                      <select
                        className="select-field"
                        value={mapping.credit}
                        onChange={(e) => setMapping({ ...mapping, credit: e.target.value })}
                      >
                        <option value="">-- Select Column --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h} {rawRows[0] && rawRows[0][h] ? `(e.g. "${rawRows[0][h]}")` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Category Column */}
                <div className="mapping-item">
                  <label className="form-label">Category Column (Optional)</label>
                  <select
                    className="select-field"
                    value={mapping.category}
                    onChange={(e) => setMapping({ ...mapping, category: e.target.value })}
                  >
                    <option value="">-- Auto-Guess from Description --</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h} {rawRows[0] && rawRows[0][h] ? `(e.g. "${rawRows[0][h]}")` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div className="mapping-item">
                  <label className="form-label">Payment Method Column (Optional)</label>
                  <select
                    className="select-field"
                    value={mapping.paymentMethod}
                    onChange={(e) => setMapping({ ...mapping, paymentMethod: e.target.value })}
                  >
                    <option value="">-- Use Default Payment Method --</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h} {rawRows[0] && rawRows[0][h] ? `(e.g. "${rawRows[0][h]}")` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Column */}
                {mapping.amountMode === 'single' && (
                  <div className="mapping-item">
                    <label className="form-label">Type Column (Optional - Expense/Income)</label>
                    <select
                      className="select-field"
                      value={mapping.type}
                      onChange={(e) => setMapping({ ...mapping, type: e.target.value })}
                    >
                      <option value="">-- Auto-detect from amount sign --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h} {rawRows[0] && rawRows[0][h] ? `(e.g. "${rawRows[0][h]}")` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Notes Column */}
                <div className="mapping-item">
                  <label className="form-label">Notes / Remarks Column (Optional)</label>
                  <select
                    className="select-field"
                    value={mapping.notes}
                    onChange={(e) => setMapping({ ...mapping, notes: e.target.value })}
                  >
                    <option value="">-- None --</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h} {rawRows[0] && rawRows[0][h] ? `(e.g. "${rawRows[0][h]}")` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Fallback Defaults */}
            <div className="defaults-section-card">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Default Fallbacks (when row values are unmapped or missing):
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Default Expense Category</label>
                  <select
                    className="select-field"
                    value={defaultCategory}
                    onChange={(e) => setDefaultCategory(e.target.value)}
                  >
                    {categories
                      .filter((c) => c.type === 'expense')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Default Payment Method</label>
                  <select
                    className="select-field"
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Mapping Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentStep('upload')}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleProceedToPreview}
              >
                <span>Proceed to Preview</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW, VALIDATE & COMMIT */}
        {currentStep === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Stats Summary Bar */}
            <div className="preview-stats-bar">
              <div className="preview-stat-card">
                <div className="stat-label">Selected to Import</div>
                <div className="stat-value" style={{ color: 'var(--primary)' }}>
                  {selectedCount} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {previewRows.length}</span>
                </div>
              </div>

              <div className="preview-stat-card">
                <div className="stat-label">Total Expenses</div>
                <div className="stat-value" style={{ color: 'var(--expense-red)' }}>
                  {formatCurrency(totalExpenseSum, currency.code, currency.symbol)}
                </div>
              </div>

              {totalIncomeSum > 0 && (
                <div className="preview-stat-card">
                  <div className="stat-label">Total Income</div>
                  <div className="stat-value" style={{ color: 'var(--income-green)' }}>
                    {formatCurrency(totalIncomeSum, currency.code, currency.symbol)}
                  </div>
                </div>
              )}

              {duplicateCount > 0 && (
                <div className="preview-stat-card" style={{ borderColor: 'hsla(38, 92%, 50%, 0.3)' }}>
                  <div className="stat-label" style={{ color: 'var(--warning-amber)' }}>Existing Duplicates</div>
                  <div className="stat-value" style={{ color: 'var(--warning-amber)' }}>
                    {duplicateCount}
                  </div>
                </div>
              )}

              {invalidCount > 0 && (
                <div className="preview-stat-card" style={{ borderColor: 'hsla(347, 89%, 61%, 0.3)' }}>
                  <div className="stat-label" style={{ color: 'var(--expense-red)' }}>Incomplete Rows</div>
                  <div className="stat-value" style={{ color: 'var(--expense-red)' }}>
                    {invalidCount}
                  </div>
                </div>
              )}
            </div>

            {/* Date Span Info & Filter Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <Calendar size={14} color="var(--primary)" />
                <span>
                  {detectedMonths.length > 0
                    ? `Date Span: ${detectedMonths.join(', ')}`
                    : 'No valid dates detected'}
                </span>
              </div>

              {/* Preview Filter Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  className={`btn-filter-pill ${previewFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setPreviewFilter('all')}
                >
                  All ({previewRows.length})
                </button>
                <button
                  type="button"
                  className={`btn-filter-pill ${previewFilter === 'valid' ? 'active' : ''}`}
                  onClick={() => setPreviewFilter('valid')}
                >
                  Ready ({previewRows.filter((r) => r.isValid && !r.isDuplicate).length})
                </button>
                {(invalidCount > 0 || duplicateCount > 0) && (
                  <button
                    type="button"
                    className={`btn-filter-pill ${previewFilter === 'issues' ? 'active' : ''}`}
                    onClick={() => setPreviewFilter('issues')}
                  >
                    Warnings & Incomplete ({invalidCount + duplicateCount})
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Preview Table */}
            <div className="table-responsive preview-table-container">
              <table className="custom-table preview-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={previewRows.length > 0 && previewRows.every((r) => r.selected)}
                        onChange={handleToggleSelectAll}
                        style={{ cursor: 'pointer' }}
                        title="Select/Deselect All"
                      />
                    </th>
                    <th style={{ width: '80px' }}>Status</th>
                    <th style={{ width: '130px' }}>Date</th>
                    <th>Description</th>
                    <th style={{ width: '150px' }}>Category</th>
                    <th style={{ width: '100px' }}>Type</th>
                    <th style={{ width: '110px' }}>Amount ({currency.symbol})</th>
                    <th style={{ width: '130px' }}>Payment</th>
                    <th style={{ width: '40px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreviewRows.map((row) => {
                    const currentCat = categories.find((c) => c.id === row.categoryId) || {
                      name: 'Uncategorized',
                      color: '#64748b',
                      icon: 'CircleDollarSign'
                    };

                    return (
                      <tr
                        key={row.tempId}
                        className={`${!row.isValid ? 'row-invalid' : ''} ${row.isDuplicate ? 'row-duplicate' : ''}`}
                      >
                        {/* Checkbox */}
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={!row.isValid}
                            onChange={() => handleToggleRowSelect(row.tempId)}
                            style={{ cursor: row.isValid ? 'pointer' : 'not-allowed' }}
                          />
                        </td>

                        {/* Status badge */}
                        <td>
                          {!row.isValid ? (
                            <span
                              className="status-pill status-error"
                              title="Missing valid date, amount or description"
                            >
                              <XCircle size={12} />
                              <span>Invalid</span>
                            </span>
                          ) : row.isDuplicate ? (
                            <span
                              className="status-pill status-warning"
                              title="An identical transaction exists with same date, amount, description"
                            >
                              <AlertTriangle size={12} />
                              <span>Duplicate</span>
                            </span>
                          ) : (
                            <span className="status-pill status-ok">
                              <CheckCircle2 size={12} />
                              <span>Ready</span>
                            </span>
                          )}
                        </td>

                        {/* Date input */}
                        <td>
                          <input
                            type="date"
                            className="inline-table-input"
                            value={row.date || ''}
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.tempId, 'date', e.target.value)
                            }
                          />
                        </td>

                        {/* Description input */}
                        <td>
                          <input
                            type="text"
                            className="inline-table-input"
                            value={row.description || ''}
                            placeholder="Description"
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.tempId, 'description', e.target.value)
                            }
                          />
                        </td>

                        {/* Category Dropdown */}
                        <td>
                          <select
                            className="inline-table-input"
                            value={row.categoryId}
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.tempId, 'categoryId', e.target.value)
                            }
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.type})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Type Toggle */}
                        <td>
                          <select
                            className="inline-table-input"
                            value={row.type}
                            style={{
                              color: row.type === 'income' ? 'var(--income-green)' : 'var(--expense-red)',
                              fontWeight: 600
                            }}
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.tempId, 'type', e.target.value)
                            }
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                        </td>

                        {/* Amount */}
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            className="inline-table-input"
                            style={{ textAlign: 'right', fontWeight: 600 }}
                            value={row.amount || ''}
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.tempId, 'amount', e.target.value)
                            }
                          />
                        </td>

                        {/* Payment Method */}
                        <td>
                          <select
                            className="inline-table-input"
                            value={row.paymentMethod}
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.tempId, 'paymentMethod', e.target.value)
                            }
                          >
                            {PAYMENT_METHODS.map((pm) => (
                              <option key={pm.id} value={pm.id}>
                                {pm.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Delete Row Action */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ width: '26px', height: '26px', color: 'var(--text-muted)' }}
                            title="Remove row"
                            onClick={() => handleDeletePreviewRow(row.tempId)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Options & Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="jumpMonthCheckbox"
                  checked={jumpToImportedMonth}
                  onChange={(e) => setJumpToImportedMonth(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label
                  htmlFor="jumpMonthCheckbox"
                  style={{ fontSize: '0.84rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Jump active view to imported month on completion
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCurrentStep('mapping')}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Mapping</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={selectedCount === 0}
                  onClick={handleConfirmImport}
                >
                  <Check size={16} />
                  <span>Import {selectedCount} Transactions</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
