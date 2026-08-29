import React from 'react';
import { useExpense } from '../context/ExpenseContext';
import {
  Wallet,
  ChevronLeft,
  ChevronRight,
  Plus,
  Moon,
  Sun,
  Calendar,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { getMonthName } from '../utils/formatters';

export const Header = () => {
  const {
    theme,
    setTheme,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    handlePrevMonth,
    handleNextMonth,
    setIsTxModalOpen,
    setEditingTx,
    setIsReceiptScannerOpen,
    setIsFileImportOpen
  } = useExpense();

  const handleOpenAddModal = () => {
    setEditingTx(null);
    setIsTxModalOpen(true);
  };

  const handleJumpToCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(String(now.getMonth() + 1).padStart(2, '0'));
    setSelectedYear(now.getFullYear());
  };

  return (
    <header className="header-wrapper">
      <div className="logo-container">
        <div className="logo-icon-badge">
          <Wallet size={24} />
        </div>
        <div>
          <div className="app-title">Expanses Tracker</div>
          <div className="app-subtitle">Personal Monthly Expense Tracker</div>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="month-navigator">
        <button
          className="month-nav-btn"
          onClick={handlePrevMonth}
          title="Previous Month"
          aria-label="Previous Month"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="current-month-display">
          {getMonthName(selectedMonth)} {selectedYear}
        </div>
        <button
          className="month-nav-btn"
          onClick={handleNextMonth}
          title="Next Month"
          aria-label="Next Month"
        >
          <ChevronRight size={18} />
        </button>
        <button
          className="month-nav-btn"
          onClick={handleJumpToCurrentMonth}
          title="Jump to Current Month"
          aria-label="Current Month"
        >
          <Calendar size={15} />
        </button>
      </div>

      {/* Header Actions */}
      <div className="header-actions">
        <button
          className="btn-icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        {/* Import CSV / Excel File Button */}
        <button
          className="btn btn-secondary"
          onClick={() => setIsFileImportOpen(true)}
          title="Import transactions from CSV or Excel file (.xlsx, .csv, .xls)"
        >
          <FileSpreadsheet size={16} color="var(--income-green)" />
          <span>Import CSV / Excel</span>
        </button>

        {/* Scan Receipt (AI) Button */}
        <button
          className="btn btn-secondary"
          style={{
            borderColor: 'var(--border-highlight)',
            background: 'linear-gradient(135deg, hsla(239, 84%, 67%, 0.12) 0%, hsla(270, 75%, 60%, 0.12) 100%)',
            color: 'var(--text-main)'
          }}
          onClick={() => setIsReceiptScannerOpen(true)}
          title="Upload or capture receipt photo for AI item breakdown"
        >
          <Sparkles size={16} color="var(--primary)" />
          <span>Scan Receipt</span>
        </button>

        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} />
          <span>Add Transaction</span>
        </button>
      </div>
    </header>
  );
};
