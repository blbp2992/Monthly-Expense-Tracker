import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_BUDGETS,
  INITIAL_TRANSACTIONS,
  INITIAL_SUBSCRIPTIONS,
  DEFAULT_CURRENCIES
} from '../data/initialData';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { getDaysInMonth, getRemainingDaysInMonth } from '../utils/formatters';

const ExpenseContext = createContext();

export const ExpenseProvider = ({ children }) => {
  const initialYear = 2026;
  const initialMonth = '07';

  // Core Persisted States
  const [transactions, setTransactions] = useState(() => {
    const saved = loadFromStorage('transactions', null);
    if (!saved || saved.length <= 12) {
      return INITIAL_TRANSACTIONS;
    }
    const existingIds = new Set(saved.map((t) => t.id));
    const toAdd = INITIAL_TRANSACTIONS.filter((t) => !existingIds.has(t.id));
    return [...saved, ...toAdd];
  });

  const [categories, setCategories] = useState(() => {
    const saved = loadFromStorage('categories', null);
    if (!saved) return DEFAULT_CATEGORIES;
    const existingIds = new Set(saved.map((c) => c.id));
    const toAdd = DEFAULT_CATEGORIES.filter((c) => !existingIds.has(c.id));
    return [...saved, ...toAdd];
  });

  const [budgets, setBudgets] = useState(() => {
    const saved = loadFromStorage('budgets', null);
    return saved ? { ...DEFAULT_BUDGETS, ...saved } : DEFAULT_BUDGETS;
  });

  const [subscriptions, setSubscriptions] = useState(() =>
    loadFromStorage('subscriptions', INITIAL_SUBSCRIPTIONS)
  );

  const [currency, setCurrency] = useState(() =>
    loadFromStorage('currency', DEFAULT_CURRENCIES[0])
  );

  const [theme, setTheme] = useState(() =>
    loadFromStorage('theme', 'dark')
  );

  const [geminiApiKey, setGeminiApiKey] = useState(() =>
    loadFromStorage('gemini_api_key', '')
  );

  // Active View & Filter Navigation States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);

  // Search & Filter Criteria for Transactions View
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all'); // all | expense | income
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  // Interactive UI Modal States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [receiptViewerTx, setReceiptViewerTx] = useState(null);
  const [isFileImportOpen, setIsFileImportOpen] = useState(false);

  // Toast Notification System
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync to Storage
  useEffect(() => {
    saveToStorage('transactions', transactions);
  }, [transactions]);

  useEffect(() => {
    saveToStorage('categories', categories);
  }, [categories]);

  useEffect(() => {
    saveToStorage('budgets', budgets);
  }, [budgets]);

  useEffect(() => {
    saveToStorage('subscriptions', subscriptions);
  }, [subscriptions]);

  useEffect(() => {
    saveToStorage('currency', currency);
  }, [currency]);

  useEffect(() => {
    saveToStorage('gemini_api_key', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    saveToStorage('theme', theme);
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
  }, [theme]);

  // Navigate Months
  const handlePrevMonth = () => {
    let m = Number(selectedMonth) - 1;
    let y = selectedYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(y);
  };

  const handleNextMonth = () => {
    let m = Number(selectedMonth) + 1;
    let y = selectedYear;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(y);
  };

  // Filter transactions belonging to current selected Month and Year
  const currentMonthTransactions = useMemo(() => {
    const prefix = `${selectedYear}-${selectedMonth}`;
    return transactions.filter((t) => t.date && t.date.startsWith(prefix));
  }, [transactions, selectedYear, selectedMonth]);

  // Financial Metrics Calculation for Selected Month
  const monthlyMetrics = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    const categorySpendMap = {};

    currentMonthTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        totalIncome += amt;
      } else if (tx.type === 'expense') {
        totalExpenses += amt;
        categorySpendMap[tx.categoryId] = (categorySpendMap[tx.categoryId] || 0) + amt;
      }
    });

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

    // Total Budget sum
    const totalBudget = Object.values(budgets).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    const budgetRemaining = Math.max(0, totalBudget - totalExpenses);
    const budgetUsagePercent = totalBudget > 0 ? Math.min(100, Math.round((totalExpenses / totalBudget) * 100)) : 0;

    // Safe Daily Spending Allowance
    const remainingDays = getRemainingDaysInMonth(selectedYear, selectedMonth);
    const safeDailyAllowance = budgetRemaining > 0 ? (budgetRemaining / remainingDays) : 0;

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      categorySpendMap,
      totalBudget,
      budgetRemaining,
      budgetUsagePercent,
      remainingDays,
      safeDailyAllowance
    };
  }, [currentMonthTransactions, budgets, selectedYear, selectedMonth]);

  // Filtered and Sorted Transactions for List View
  const filteredTransactions = useMemo(() => {
    return currentMonthTransactions
      .filter((tx) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = (tx.description || '').toLowerCase().includes(q);
          const matchNote = (tx.notes || '').toLowerCase().includes(q);
          const cat = categories.find((c) => c.id === tx.categoryId);
          const matchCat = cat && cat.name.toLowerCase().includes(q);
          // Also search itemized names if available
          const matchItems = tx.receiptItems && tx.receiptItems.some((item) => item.name.toLowerCase().includes(q));
          if (!matchDesc && !matchNote && !matchCat && !matchItems) return false;
        }

        if (filterCategory !== 'all' && tx.categoryId !== filterCategory) {
          return false;
        }

        if (filterType !== 'all' && tx.type !== filterType) {
          return false;
        }

        if (filterPaymentMethod !== 'all' && tx.paymentMethod !== filterPaymentMethod) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        return 0;
      });
  }, [
    currentMonthTransactions,
    searchQuery,
    filterCategory,
    filterType,
    filterPaymentMethod,
    sortBy,
    categories
  ]);

  // Transaction CRUD Actions
  const addTransaction = (newTx) => {
    const transaction = {
      ...newTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amount: parseFloat(newTx.amount) || 0
    };
    setTransactions((prev) => [transaction, ...prev]);
    addToast(`Added ${transaction.type === 'income' ? 'income' : 'expense'}: ${transaction.description}`);
    return transaction;
  };

  const addBatchTransactions = (txList, customToastMsg) => {
    const formatted = txList.map((t, idx) => ({
      ...t,
      id: `tx-${Date.now() + idx}-${Math.random().toString(36).substring(2, 6)}`,
      amount: parseFloat(t.amount) || 0
    }));
    setTransactions((prev) => [...formatted, ...prev]);
    addToast(customToastMsg || `Logged ${formatted.length} itemized expenses!`);
  };

  const importTransactionsFromFile = (txList, jumpToDate = true) => {
    if (!txList || txList.length === 0) return;
    const formatted = txList.map((t, idx) => ({
      id: `tx-${Date.now() + idx}-${Math.random().toString(36).substring(2, 6)}`,
      type: t.type || 'expense',
      amount: parseFloat(t.amount) || 0,
      categoryId: t.categoryId || 'cat_groceries',
      date: t.date,
      paymentMethod: t.paymentMethod || 'credit_card',
      description: t.description || 'Imported Transaction',
      notes: t.notes || ''
    }));

    setTransactions((prev) => [...formatted, ...prev]);

    // If jumpToDate, jump to the month of the latest transaction in the batch
    if (jumpToDate && formatted.length > 0) {
      const sortedDates = [...formatted].map((t) => t.date).filter(Boolean).sort();
      if (sortedDates.length > 0) {
        const latest = sortedDates[sortedDates.length - 1];
        const [y, m] = latest.split('-');
        if (y && m) {
          setSelectedYear(Number(y));
          setSelectedMonth(m);
        }
      }
    }

    addToast(`Successfully imported ${formatted.length} transactions!`, 'success');
  };

  const updateTransaction = (id, updatedData) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updatedData, amount: parseFloat(updatedData.amount) || 0 } : tx))
    );
    addToast('Transaction updated successfully');
  };

  const deleteTransaction = (id) => {
    const txToDelete = transactions.find((t) => t.id === id);
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    addToast(`Deleted "${txToDelete?.description || 'Transaction'}"`, 'info');
  };

  const duplicateTransaction = (id) => {
    const txToDup = transactions.find((t) => t.id === id);
    if (!txToDup) return;
    const duplicated = {
      ...txToDup,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: `${txToDup.description} (Copy)`
    };
    setTransactions((prev) => [duplicated, ...prev]);
    addToast(`Duplicated "${txToDup.description}"`);
  };

  // Budget Management Actions
  const updateCategoryBudget = (categoryId, amount) => {
    setBudgets((prev) => ({
      ...prev,
      [categoryId]: Math.max(0, parseFloat(amount) || 0)
    }));
    addToast('Budget target updated');
  };

  // Subscription Actions
  const addSubscription = (sub) => {
    const newSub = {
      ...sub,
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amount: parseFloat(sub.amount) || 0,
      active: true
    };
    setSubscriptions((prev) => [...prev, newSub]);
    addToast(`Added recurring bill: ${newSub.name}`);
  };

  const updateSubscription = (id, updated) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated, amount: parseFloat(updated.amount) || 0 } : s))
    );
    addToast('Subscription updated');
  };

  const deleteSubscription = (id) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    addToast('Subscription removed', 'info');
  };

  const toggleSubscription = (id) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  // Category Actions
  const addCategory = (cat) => {
    const newCat = {
      ...cat,
      id: `cat_${Date.now()}`
    };
    setCategories((prev) => [...prev, newCat]);
    addToast(`Added category "${newCat.name}"`);
  };

  const deleteCategory = (id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    addToast('Category deleted', 'info');
  };

  const updateCategoryName = (id, newName) => {
    if (!newName.trim()) return;
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName.trim() } : c))
    );
    addToast(`Category renamed to "${newName.trim()}"`);
  };

  // System Resets & Imports
  const resetToDemoData = () => {
    setTransactions(INITIAL_TRANSACTIONS);
    setCategories(DEFAULT_CATEGORIES);
    setBudgets(DEFAULT_BUDGETS);
    setSubscriptions(INITIAL_SUBSCRIPTIONS);
    addToast('Restored demo sample dataset');
  };

  const clearAllData = () => {
    setTransactions([]);
    setBudgets({});
    setSubscriptions([]);
    addToast('All expense data cleared', 'info');
  };

  const importBackupData = (imported) => {
    try {
      if (imported.transactions) setTransactions(imported.transactions);
      if (imported.categories) setCategories(imported.categories);
      if (imported.budgets) setBudgets(imported.budgets);
      if (imported.subscriptions) setSubscriptions(imported.subscriptions);
      if (imported.currency) setCurrency(imported.currency);
      addToast('Backup data imported successfully!');
    } catch {
      addToast('Failed to import backup file. Invalid format.', 'error');
    }
  };

  return (
    <ExpenseContext.Provider
      value={{
        // Data States
        transactions,
        categories,
        budgets,
        subscriptions,
        currency,
        theme,
        geminiApiKey,
        activeTab,
        selectedMonth,
        selectedYear,
        toasts,

        // Filters & Search
        searchQuery,
        filterCategory,
        filterType,
        filterPaymentMethod,
        sortBy,
        filteredTransactions,
        currentMonthTransactions,
        monthlyMetrics,

        // Modal States
        isTxModalOpen,
        editingTx,
        isBudgetModalOpen,
        isSubModalOpen,
        editingSub,
        isCategoryModalOpen,
        isReceiptScannerOpen,
        receiptViewerTx,
        isFileImportOpen,

        // Setters & Actions
        setTheme,
        setCurrency,
        setGeminiApiKey,
        setActiveTab,
        setSelectedMonth,
        setSelectedYear,
        setSearchQuery,
        setFilterCategory,
        setFilterType,
        setFilterPaymentMethod,
        setSortBy,
        handlePrevMonth,
        handleNextMonth,

        setIsTxModalOpen,
        setEditingTx,
        setIsBudgetModalOpen,
        setIsSubModalOpen,
        setEditingSub,
        setIsCategoryModalOpen,
        setIsReceiptScannerOpen,
        setReceiptViewerTx,
        setIsFileImportOpen,

        addTransaction,
        addBatchTransactions,
        importTransactionsFromFile,
        updateTransaction,
        deleteTransaction,
        duplicateTransaction,

        updateCategoryBudget,

        addSubscription,
        updateSubscription,
        deleteSubscription,
        toggleSubscription,

        addCategory,
        deleteCategory,
        updateCategoryName,

        resetToDemoData,
        clearAllData,
        importBackupData,
        addToast,
        removeToast
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpense = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
};
