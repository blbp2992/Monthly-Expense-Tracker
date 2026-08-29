import React, { useState } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { DEFAULT_CURRENCIES } from '../../data/initialData';
import { exportDataAsJSON } from '../../utils/storage';
import { CategoryIcon } from '../UI/CategoryIcon';
import {
  Settings,
  DollarSign,
  Palette,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Plus,
  ShieldCheck,
  Check,
  Key,
  Sparkles,
  ExternalLink,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { exportTransactionsAsCSV, exportTransactionsAsExcel } from '../../utils/storage';
import { downloadSampleCSV, downloadSampleExcel } from '../../utils/fileImporter';

const AVAILABLE_ICONS = [
  'Utensils',
  'ShoppingBag',
  'Home',
  'Car',
  'Zap',
  'Film',
  'Tag',
  'HeartPulse',
  'CalendarSync',
  'Plane',
  'Briefcase',
  'Laptop',
  'TrendingUp',
  'Gift',
  'Coffee',
  'Smartphone',
  'BookOpen',
  'Dumbbell',
  'Music',
  'Camera',
  'CircleDollarSign'
];

export const SettingsView = () => {
  const {
    transactions,
    categories,
    budgets,
    subscriptions,
    currency,
    setCurrency,
    theme,
    setTheme,
    geminiApiKey,
    setGeminiApiKey,
    setIsFileImportOpen,
    addCategory,
    deleteCategory,
    resetToDemoData,
    clearAllData,
    importBackupData,
    addToast
  } = useExpense();

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [newCatIcon, setNewCatIcon] = useState('Tag');

  // API Key State
  const [keyInput, setKeyInput] = useState(geminiApiKey || '');

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    setGeminiApiKey(keyInput.trim());
    addToast(keyInput.trim() ? 'Gemini API Key saved!' : 'Gemini API Key cleared');
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    addCategory({
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: newCatIcon
    });

    setNewCatName('');
  };

  const handleExportBackup = () => {
    const fullState = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      transactions,
      categories,
      budgets,
      subscriptions,
      currency
    };
    exportDataAsJSON(fullState);
    addToast('Backup file downloaded');
  };

  const handleExportAllCSV = () => {
    if (transactions.length === 0) {
      addToast('No transactions to export', 'info');
      return;
    }
    exportTransactionsAsCSV(transactions, categories, `all_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    addToast(`Exported all ${transactions.length} transactions to CSV`);
  };

  const handleExportAllExcel = () => {
    if (transactions.length === 0) {
      addToast('No transactions to export', 'info');
      return;
    }
    exportTransactionsAsExcel(transactions, categories, `all_transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
    addToast(`Exported all ${transactions.length} transactions to Excel (.xlsx)`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.transactions || parsed.categories) {
          importBackupData(parsed);
        } else {
          addToast('Invalid Expanses Tracker backup file', 'error');
        }
      } catch (err) {
        addToast('Error reading backup file', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* General App Settings */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Settings size={22} color="var(--primary)" />
            <span>Preferences & Currency</span>
          </div>
        </div>

        <div className="form-row">
          {/* Currency Selection */}
          <div className="form-group">
            <label className="form-label">Active Currency</label>
            <select
              className="select-field"
              value={currency.code}
              onChange={(e) => {
                const found = DEFAULT_CURRENCIES.find((c) => c.code === e.target.value);
                if (found) setCurrency(found);
              }}
            >
              {DEFAULT_CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Preference */}
          <div className="form-group">
            <label className="form-label">Theme Appearance</label>
            <select
              className="select-field"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="dark">Dark Theme (Deep Slate)</option>
              <option value="light">Light Theme (Clean Glass)</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Vision API Key Integration */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Sparkles size={20} color="var(--primary)" />
            <span>AI Receipt Scanner Settings (Google Gemini)</span>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Expanses Tracker works out-of-the-box with sample/smart recognition. For live multimodal
          parsing of any real photo receipt, provide a free Google Gemini API key from{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
          >
            Google AI Studio <ExternalLink size={12} />
          </a>
          . Your key is stored securely 100% inside your browser localStorage.
        </p>

        <form onSubmit={handleSaveApiKey} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1 1 300px' }}>
            <input
              type="password"
              className="form-input"
              placeholder="Paste your Gemini API Key (e.g. AIzaSy...)"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.2rem' }}>
            <Key size={16} />
            <span>Save API Key</span>
          </button>
        </form>
      </div>

      {/* Category Manager */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Palette size={20} color="var(--accent-purple)" />
            <span>Custom Category Manager</span>
          </div>
        </div>

        {/* Add Category Form */}
        <form
          onSubmit={handleCreateCategory}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem',
            alignItems: 'flex-end'
          }}
        >
          <div className="form-group" style={{ flex: '1 1 200px' }}>
            <label className="form-label">Category Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Coffee & Snacks, Gym, Pet Supplies"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ flex: '1 1 120px' }}>
            <label className="form-label">Type</label>
            <select
              className="select-field"
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="form-group" style={{ flex: '0 0 70px' }}>
            <label className="form-label">Color</label>
            <input
              type="color"
              className="form-input"
              style={{ height: '42px', padding: '0.2rem', cursor: 'pointer' }}
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">Icon</label>
            <select
              className="select-field"
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
            >
              {AVAILABLE_ICONS.map((iconName) => (
                <option key={iconName} value={iconName}>
                  {iconName}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        </form>

        {/* Existing Categories List */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '0.85rem'
          }}
        >
          {categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  className="category-pill"
                  style={{
                    backgroundColor: `${cat.color}22`,
                    color: cat.color
                  }}
                >
                  <CategoryIcon name={cat.icon} size={15} color={cat.color} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cat.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {cat.type}
                  </div>
                </div>
              </div>

              {/* Allow delete if custom */}
              <button
                className="btn-icon"
                style={{ width: '28px', height: '28px', color: 'var(--expense-red)' }}
                title="Delete Category"
                onClick={() => {
                  if (window.confirm(`Delete category "${cat.name}"?`)) {
                    deleteCategory(cat.id);
                  }
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Spreadsheet Import & Export Hub */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <FileSpreadsheet size={20} color="var(--income-green)" />
            <span>CSV & Excel Spreadsheet Hub</span>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Seamlessly import transactions from your bank statements or custom Excel/CSV files, or export your full financial history to Excel (.xlsx) and CSV (.csv).
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => setIsFileImportOpen(true)}
          >
            <FileSpreadsheet size={16} />
            <span>Import CSV / Excel File</span>
          </button>

          <button className="btn btn-secondary" onClick={handleExportAllExcel}>
            <Download size={16} />
            <span>Export All Transactions (.xlsx)</span>
          </button>

          <button className="btn btn-secondary" onClick={handleExportAllCSV}>
            <Download size={16} />
            <span>Export All Transactions (.csv)</span>
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '0.85rem 1rem',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Need blank template files with sample columns?
          </div>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            onClick={downloadSampleExcel}
          >
            <Download size={14} />
            <span>Download Sample Excel</span>
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            onClick={downloadSampleCSV}
          >
            <Download size={14} />
            <span>Download Sample CSV</span>
          </button>
        </div>
      </div>

      {/* Data Management & Backups */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <ShieldCheck size={20} color="var(--primary)" />
            <span>Full System Backup & Storage</span>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          All your financial data is safely stored offline in your browser local storage. You can
          export complete JSON backups (including categories, budgets, and subscriptions), restore them anytime, or reset to demo data.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
          <button className="btn btn-secondary" onClick={handleExportBackup}>
            <Download size={16} />
            <span>Export Full JSON Backup</span>
          </button>

          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={16} />
            <span>Restore Backup JSON</span>
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </label>

          <button className="btn btn-secondary" onClick={resetToDemoData}>
            <RotateCcw size={16} />
            <span>Restore Sample Demo Data</span>
          </button>

          <button
            className="btn btn-danger"
            onClick={() => {
              if (
                window.confirm(
                  'Are you sure you want to clear all transactions, budgets, and subscriptions?'
                )
              ) {
                clearAllData();
              }
            }}
          >
            <Trash2 size={16} />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
