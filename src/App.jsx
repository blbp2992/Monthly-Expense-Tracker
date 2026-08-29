import React from 'react';
import { ExpenseProvider, useExpense } from './context/ExpenseContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { SummaryCards } from './components/Dashboard/SummaryCards';
import { BudgetProgress } from './components/Dashboard/BudgetProgress';
import { ChartsSection } from './components/Dashboard/ChartsSection';
import { TransactionList } from './components/Transactions/TransactionList';
import { TransactionModal } from './components/Transactions/TransactionModal';
import { BudgetManager } from './components/Budgets/BudgetManager';
import { RecurringTracker } from './components/Subscriptions/RecurringTracker';
import { DeepAnalytics } from './components/Analytics/DeepAnalytics';
import { SettingsView } from './components/Settings/SettingsView';
import { ReceiptScannerModal } from './components/Receipts/ReceiptScannerModal';
import { ReceiptViewerModal } from './components/Receipts/ReceiptViewerModal';
import { FileImportModal } from './components/Transactions/FileImportModal';
import { ToastContainer } from './components/UI/ToastContainer';

const MainApp = () => {
  const { activeTab } = useExpense();

  return (
    <div className="app-container">
      <main className="main-content">
        <Header />
        <Navigation />

        {/* Dynamic Views */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <SummaryCards />
            <div className="dashboard-grid">
              <ChartsSection />
              <BudgetProgress />
            </div>
            <TransactionList />
          </div>
        )}

        {activeTab === 'transactions' && <TransactionList />}

        {activeTab === 'budgets' && <BudgetManager />}

        {activeTab === 'subscriptions' && <RecurringTracker />}

        {activeTab === 'analytics' && <DeepAnalytics />}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Global Modals & Notifications */}
      <TransactionModal />
      <ReceiptScannerModal />
      <ReceiptViewerModal />
      <FileImportModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ExpenseProvider>
      <MainApp />
    </ExpenseProvider>
  );
}
